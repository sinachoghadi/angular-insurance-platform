import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClaimCreateStore } from './claim-create-store';
import { ACTIVE_POLICY, CLAIM } from '../testing/claim-fixtures';
describe('ClaimCreateStore', () => {
  let store: ClaimCreateStore, http: HttpTestingController;
  const policyRequest = () => http.expectOne((r) => r.url === '/api/policies');
  function fill() {
    store.select(ACTIVE_POLICY.id);
    store.form.patchValue({
      incidentDate: '2025-02-01',
      description: 'A fictional incident report.',
      estimatedAmount: 1000,
    });
  }
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClaimCreateStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store = TestBed.inject(ClaimCreateStore);
    const req = policyRequest();
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ items: [ACTIVE_POLICY], total: 1, page: 1, pageSize: 10 });
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });
  it('requires an active policy, covered past incident and valid financial/description fields', () => {
    expect(store.form.invalid).toBe(true);
    store.submit();
    http.expectNone('/api/claims');
    fill();
    expect(store.form.valid).toBe(true);
    store.form.controls.incidentDate.setValue('2024-01-01');
    expect(store.form.hasError('coverage')).toBe(true);
    store.form.controls.incidentDate.setValue('2999-01-01');
    expect(store.form.controls.incidentDate.invalid).toBe(true);
    store.form.controls.estimatedAmount.setValue(0);
    expect(store.form.controls.estimatedAmount.invalid).toBe(true);
    store.form.controls.estimatedAmount.setValue(1.001);
    expect(store.form.controls.estimatedAmount.invalid).toBe(true);
    store.form.controls.description.setValue('   ');
    expect(store.form.controls.description.invalid).toBe(true);
    store.selectedPolicy.set({ ...ACTIVE_POLICY, status: 'DRAFT' });
    store.form.updateValueAndValidity();
    expect(store.form.hasError('policy')).toBe(true);
  });
  it('prevents duplicate submits and navigates to the created record', () => {
    fill();
    store.submit();
    store.submit();
    const req = http.expectOne('/api/claims');
    expect(store.saving()).toBe(true);
    expect(req.request.headers.get('Idempotency-Key')).toBeTruthy();
    req.flush(CLAIM);
    expect(store.success()).toBe(true);
    expect(store.saving()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/claims', CLAIM.id]);
    store.submit();
    http.expectNone('/api/claims');
  });
  it('recovers unknown outcomes with the same creation key and frozen body', () => {
    fill();
    store.submit();
    const first = http.expectOne('/api/claims'),
      key = first.request.headers.get('Idempotency-Key'),
      body = first.request.body;
    first.flush({}, { status: 500, statusText: 'Error' });
    expect(store.uncertain()).toBe(true);
    store.form.controls.description.setValue('Later text that must not duplicate the report.');
    store.submit();
    const retry = http.expectOne('/api/claims');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(body);
    retry.flush(CLAIM);
  });
  it('debounces eligible-policy search, cancels stale requests and resets pagination', async () => {
    store.policyPageChange(3);
    const old = policyRequest();
    vi.useFakeTimers();
    store.search.setValue('Demo');
    await vi.advanceTimersByTimeAsync(299);
    http.expectNone((r) => r.url === '/api/policies');
    await vi.advanceTimersByTimeAsync(1);
    expect(old.cancelled).toBe(true);
    const query = policyRequest();
    expect(query.request.params.get('page')).toBe('1');
    expect(query.request.params.get('search')).toBe('Demo');
    query.flush({}, { status: 500, statusText: 'Error' });
    expect(store.policyError()).toBe(true);
    store.retryPolicies();
    const retry = policyRequest();
    expect(retry.request.params.get('page')).toBe('1');
    retry.flush({ items: [], total: 0, page: 1, pageSize: 10 });
  });
});
