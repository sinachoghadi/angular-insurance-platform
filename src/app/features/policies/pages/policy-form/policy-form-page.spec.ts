import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth-store';
import { Viewport } from '../../../../core/services/viewport';
import { PolicyFormPage } from './policy-form-page';
import { unsavedPolicyGuard } from '../../forms/unsaved-policy-guard';
describe('PolicyFormPage', () => {
  let fixture: ComponentFixture<PolicyFormPage>, http: HttpTestingController;
  const buttons = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  const click = (text: string) =>
    buttons()
      .find((button) => button.textContent?.includes(text))!
      .click();
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthStore, useValue: { role: () => 'AGENT' } },
        { provide: Viewport, useValue: { isCompact: signal(false) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PolicyFormPage);
    await fixture.whenStable();
  });
  afterEach(() => http.verify());
  it('renders four steps and shows customer errors without advancing', async () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]').length).toBe(4);
    click('Next: Product');
    await fixture.whenStable();
    expect(fixture.componentInstance.store.currentStep()).toBe(0);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('mat-error')?.textContent,
    ).toContain('required');
  });
  it('changes product fields dynamically and adds/removes beneficiary rows', async () => {
    const store = fixture.componentInstance.store;
    store.form.controls.product.controls.insuranceType.setValue('Life');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Beneficiaries');
    click('Add beneficiary');
    await fixture.whenStable();
    expect(store.form.controls.product.controls.life.controls.beneficiaries.length).toBe(2);
    click('Remove beneficiary');
    await fixture.whenStable();
    expect(store.form.controls.product.controls.life.controls.beneficiaries.length).toBe(1);
    store.form.controls.product.controls.insuranceType.setValue('Health');
    await fixture.whenStable();
    click('Add insured person');
    await fixture.whenStable();
    expect(store.form.controls.product.controls.health.controls.additionalPersons.length).toBe(1);
  });
  it('advances valid steps, preserves customer data and renders the review summary', async () => {
    const store = fixture.componentInstance.store;
    store.form.controls.customer.patchValue({
      fullName: 'Review Demo Customer',
      nationalId: '1234567890',
      mobile: '09123456789',
      dateOfBirth: '1990-01-01',
    });
    click('Next: Product');
    await fixture.whenStable();
    expect(store.currentStep()).toBe(1);
    store.form.controls.product.controls.vehicle.patchValue({
      plate: 'DEMO-123',
      model: 'Demo Sedan',
      year: 2020,
    });
    click('Next: Coverage');
    await fixture.whenStable();
    expect(store.currentStep()).toBe(2);
    store.form.controls.coverage.patchValue({
      startDate: '2027-01-01',
      endDate: '2028-01-01',
      options: ['Accident'],
    });
    click('Next: Review');
    await fixture.whenStable();
    expect(store.currentStep()).toBe(3);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Review',
    );
    expect(root.querySelector('app-policy-review')?.textContent).toContain('Review Demo Customer');
    expect(root.querySelector('app-policy-review')?.textContent).toContain('$400.00');
    expect(root.querySelector('app-policy-review')?.textContent).toContain('DEMO-123');
    click('Back');
    await fixture.whenStable();
    expect(store.form.controls.customer.controls.fullName.value).toBe('Review Demo Customer');
  });
  it('warns on unsaved browser exits and asks before discarding a draft', async () => {
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    fixture.componentInstance.store.form.controls.customer.controls.fullName.setValue(
      'Demo Changes',
    );
    fixture.componentInstance.beforeUnload(event);
    expect(event.defaultPrevented).toBe(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const open = vi
      .spyOn(TestBed.inject(MatDialog), 'open')
      .mockReturnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);
    click('Discard Draft');
    expect(navigate).not.toHaveBeenCalled();
    open.mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);
    click('Discard Draft');
    expect(navigate).toHaveBeenCalledWith(['/policies']);
  });
  it('protects router navigation while dirty or saving', () => {
    const store = fixture.componentInstance.store;
    const run = () =>
      TestBed.runInInjectionContext(() =>
        unsavedPolicyGuard(fixture.componentInstance, {} as never, {} as never, {} as never),
      );
    expect(run()).toBe(true);
    store.form.controls.customer.controls.fullName.setValue('Changed Demo');
    const open = vi
      .spyOn(TestBed.inject(MatDialog), 'open')
      .mockReturnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);
    const result = run();
    expect(result).not.toBe(true);
    expect(open).toHaveBeenCalled();
    store.save();
    http.expectOne('/api/policies');
    expect(run()).toBe(false);
  });
});

describe('Admin partial drafts', () => {
  it('defaults an agent without marking the form dirty and saves before completing step one', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthStore, useValue: { role: () => 'ADMIN' } },
        { provide: Viewport, useValue: { isCompact: signal(false) } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PolicyFormPage);
    http
      .expectOne('/api/users')
      .flush({
        data: [{ id: 'u-1002', name: 'Jordan Agent', role: 'AGENT', email: 'agent@demo.com' }],
      });
    await fixture.whenStable();
    const store = fixture.componentInstance.store;
    expect(store.form.controls.agentId.value).toBe('u-1002');
    expect(store.dirty()).toBe(false);
    expect(store.form.controls.customer.invalid).toBe(true);
    store.save();
    const request = http.expectOne('/api/policies');
    expect(request.request.body.agentId).toBe('u-1002');
    expect(request.request.body.customer.fullName).toBe('');
    request.flush({
      id: 'p-2000',
      policyNumber: 'INS-DEMO',
      status: 'DRAFT',
      version: 1,
      updatedAt: '2026-10-30T00:00:00Z',
      agentId: 'u-1002',
      agentName: 'Jordan Agent',
    });
    expect(store.currentStep()).toBe(0);
    expect(store.dirty()).toBe(false);
    expect(store.selectedPolicy()?.status).toBe('DRAFT');
    http.verify();
  });
});
