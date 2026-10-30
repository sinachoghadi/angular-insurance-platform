import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth-store';
import { Policy } from '../models/policy';
import { serializePolicy } from '../forms/policy-form-factory';
import { PolicyFormStore } from './policy-form-store';
describe('PolicyFormStore', () => {
  let store: PolicyFormStore, http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  const saved = (version = 1): Policy => ({
    id: 'p-2000',
    policyNumber: 'INS-DEMO',
    customerName: 'Demo Customer',
    customerNationalId: '1234567890',
    insuranceType: 'Third Party',
    premium: 300,
    startDate: '2027-01-01',
    endDate: '2028-01-01',
    status: 'DRAFT',
    agentId: 'u-1002',
    agentName: 'Jordan Agent',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    version,
    formData: serializePolicy(store.form),
  });
  function fill() {
    store.form.controls.customer.patchValue({
      fullName: 'Demo Customer',
      nationalId: '1234567890',
      mobile: '09123456789',
      dateOfBirth: '1990-01-01',
    });
    store.form.controls.product.controls.vehicle.patchValue({
      plate: 'DEMO-123',
      model: 'Demo Sedan',
      year: 2020,
    });
    store.form.controls.coverage.patchValue({ startDate: '2027-01-01', endDate: '2028-01-01' });
  }
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PolicyFormStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthStore, useValue: { role: () => 'AGENT' } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store = TestBed.inject(PolicyFormStore);
    store.initialize(null);
  });
  afterEach(() => http.verify());
  it('blocks invalid steps and preserves values when going back', () => {
    store.next();
    expect(store.currentStep()).toBe(0);
    expect(store.form.controls.customer.touched).toBe(true);
    fill();
    store.next();
    expect(store.currentStep()).toBe(1);
    store.next();
    expect(store.currentStep()).toBe(2);
    store.currentStep.set(0);
    expect(store.form.controls.product.controls.vehicle.controls.model.value).toBe('Demo Sedan');
  });
  it('saves partial drafts once, exposes status and restores by ID', () => {
    store.form.controls.customer.controls.fullName.setValue('Demo');
    expect(store.dirty()).toBe(true);
    store.save();
    store.save();
    expect(store.saving()).toBe(true);
    const req = http.expectOne('/api/policies');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    req.flush(saved());
    expect(store.saving()).toBe(false);
    expect(store.dirty()).toBe(false);
    expect(store.draftStatus()).toBe('Draft saved');
    store.initialize('p-2000');
    http.expectOne('/api/policies/p-2000').flush(saved());
    expect(store.form.controls.customer.controls.fullName.value).toBe('Demo');
    expect(store.initialized()).toBe(true);
  });
  it('preserves entered values after errors and retries create with the same key', () => {
    fill();
    store.save();
    const first = http.expectOne('/api/policies');
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({}, { status: 500, statusText: 'Error' });
    expect(store.dirty()).toBe(true);
    expect(store.error()).toContain('preserved');
    store.save();
    const retry = http.expectOne('/api/policies');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(saved());
  });
  it('recovers a timed-out create before persisting subsequent edits', () => {
    fill();
    store.save();
    http.expectOne('/api/policies').flush({}, { status: 500, statusText: 'Lost response' });
    store.form.controls.customer.controls.fullName.setValue('Later Edits');
    store.save();
    const retry = http.expectOne('/api/policies');
    expect(retry.request.body.customer.fullName).toBe('Demo Customer');
    retry.flush(saved());
    const patch = http.expectOne('/api/policies/p-2000');
    expect(patch.request.body.customer.fullName).toBe('Later Edits');
    patch.flush(saved(2));
    expect(store.dirty()).toBe(false);
  });
  it('cancels obsolete draft loads', () => {
    store.initialize('p-2000');
    const old = http.expectOne('/api/policies/p-2000');
    store.initialize('p-2001');
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/policies/p-2001').flush({ ...saved(), id: 'p-2001' });
    expect(store.selectedPolicy()?.id).toBe('p-2001');
    expect(store.loading()).toBe(false);
  });
  it('validates before submit, saves then submits exactly once and navigates to details', () => {
    store.submit();
    http.expectNone('/api/policies');
    expect(store.error()).toContain('highlighted');
    fill();
    store.submit();
    store.submit();
    const draft = saved();
    http.expectOne('/api/policies').flush(draft);
    expect(store.submitting()).toBe(true);
    const submit = http.expectOne('/api/policies/p-2000/submit');
    expect(submit.request.body).toEqual({ version: 1 });
    submit.flush({ ...draft, status: 'PENDING', version: 2 });
    expect(store.submitted()).toBe(true);
    expect(store.busy()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/policies', 'p-2000']);
    store.submit();
    http.expectNone('/api/policies/p-2000/submit');
  });
  it.each([403, 409])('handles forbidden/conflicting draft writes (%s)', (status) => {
    store.initialize('p-2000');
    http.expectOne('/api/policies/p-2000').flush(saved());
    store.form.controls.customer.controls.fullName.setValue('Changed Demo');
    store.save();
    http.expectOne('/api/policies/p-2000').flush({}, { status, statusText: 'Error' });
    expect(store.error()).toContain(status === 403 ? 'permission' : 'Reload');
    expect(store.dirty()).toBe(true);
  });
  it('refuses non-draft restoration and discards saved drafts through the API', () => {
    store.initialize('p-2000');
    http.expectOne('/api/policies/p-2000').flush({ ...saved(), status: 'PENDING' });
    expect(store.initialized()).toBe(false);
    expect(store.error()).toContain('Only DRAFT');
    store.initialize('p-2000');
    http.expectOne('/api/policies/p-2000').flush(saved());
    store.discard();
    const req = http.expectOne('/api/policies/p-2000');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(navigate).toHaveBeenCalledWith(['/policies']);
  });
});
