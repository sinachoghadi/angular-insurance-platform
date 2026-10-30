import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClaimsApi } from './claims-api';
import { DEFAULT_CLAIM_QUERY } from '../models/claim-query';
import { CLAIM, HISTORY, NOTE } from '../testing/claim-fixtures';
import {
  HANDLE_API_ERROR_LOCALLY,
  SKIP_SESSION_HANDLING,
} from '../../../core/interceptors/http-context';
describe('ClaimsApi', () => {
  let api: ClaimsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ClaimsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends list pagination/search/filter/sorting parameters', () => {
    const query = {
      ...DEFAULT_CLAIM_QUERY,
      page: 2,
      pageSize: 25,
      search: 'Demo',
      status: 'APPROVED',
      claimType: 'Accident',
      dateFrom: '2025-01-01',
      dateTo: '2026-01-01',
      sortBy: 'estimatedAmount' as const,
      sortOrder: 'asc' as const,
    };
    const next = vi.fn();
    api.list(query).subscribe(next);
    const req = http.expectOne((r) => r.url === '/api/claims');
    expect(req.request.context.get(HANDLE_API_ERROR_LOCALLY)).toBe(true);
    expect(req.request.context.get(SKIP_SESSION_HANDLING)).toBe(false);
    for (const [key, value] of Object.entries(query))
      expect(req.request.params.get(key)).toBe(String(value));
    const page = { items: [CLAIM], total: 90, page: 2, pageSize: 25 };
    req.flush(page);
    expect(next).toHaveBeenCalledWith(page);
  });
  it('uses typed detail/history/notes contracts and write methods', () => {
    api.get(CLAIM.id).subscribe((c) => expect(c).toEqual(CLAIM));
    http.expectOne('/api/claims/c-1001').flush(CLAIM);
    api.history(CLAIM.id).subscribe((items) => expect(items).toEqual([HISTORY]));
    http.expectOne('/api/claims/c-1001/history').flush({ items: [HISTORY] });
    api.notes(CLAIM.id).subscribe((items) => expect(items).toEqual([NOTE]));
    http.expectOne('/api/claims/c-1001/notes').flush({ items: [NOTE] });
    api.addNote(CLAIM.id, 'Internal note').subscribe();
    const note = http.expectOne('/api/claims/c-1001/notes');
    expect(note.request.method).toBe('POST');
    expect(note.request.body).toEqual({ content: 'Internal note' });
    note.flush(NOTE);
    api.transition(CLAIM.id, { status: 'UNDER_REVIEW', version: 1, reason: '' }).subscribe();
    const transition = http.expectOne('/api/claims/c-1001/transition');
    expect(transition.request.body.version).toBe(1);
    transition.flush({ ...CLAIM, status: 'UNDER_REVIEW', version: 2 });
  });
  it('includes the creation key and propagates authorization errors', () => {
    const error = vi.fn();
    api
      .create(
        {
          policyId: CLAIM.policyId,
          incidentDate: CLAIM.incidentDate,
          claimType: CLAIM.claimType,
          description: CLAIM.description,
          estimatedAmount: 1000,
        },
        'creation-key',
      )
      .subscribe({ error });
    const req = http.expectOne('/api/claims');
    expect(req.request.headers.get('Idempotency-Key')).toBe('creation-key');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(error.mock.calls[0][0].status).toBe(403);
  });
});
