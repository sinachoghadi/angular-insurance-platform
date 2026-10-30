import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store';
import { ClaimDetailsStore } from './claim-details-store';
import { CLAIM, HISTORY, NOTE } from '../testing/claim-fixtures';
describe('ClaimDetailsStore', () => {
  let store: ClaimDetailsStore,
    http: HttpTestingController,
    params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  function setup(role: 'ADMIN' | 'AGENT' = 'ADMIN') {
    params = new BehaviorSubject(convertToParamMap({ id: CLAIM.id }));
    TestBed.configureTestingModule({
      providers: [
        ClaimDetailsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: AuthStore, useValue: { role: () => role } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ClaimDetailsStore);
  }
  function flushLoad(admin = true, id = CLAIM.id) {
    http.expectOne(`/api/claims/${id}`).flush({ ...CLAIM, id });
    http.expectOne(`/api/claims/${id}/history`).flush({ items: [{ ...HISTORY, claimId: id }] });
    if (admin)
      http.expectOne(`/api/claims/${id}/notes`).flush({ items: [{ ...NOTE, claimId: id }] });
  }
  afterEach(() => http.verify());
  it('loads Admin review permissions, history and internal notes', () => {
    setup();
    expect(store.loading()).toBe(true);
    flushLoad();
    expect(store.loading()).toBe(false);
    expect(store.notes()).toEqual([NOTE]);
    expect(store.transitions()).toEqual(['UNDER_REVIEW']);
  });
  it('never requests notes or exposes review actions for Agents', () => {
    setup('AGENT');
    http.expectNone('/api/claims/c-1001/notes');
    flushLoad(false);
    expect(store.transitions()).toEqual([]);
    expect(store.notes()).toEqual([]);
    store.transition({ status: 'UNDER_REVIEW', version: 1, reason: '' });
    store.addNote('Not allowed');
    http.expectNone('/api/claims/c-1001/transition');
    http.expectNone('/api/claims/c-1001/notes');
  });
  it('sends one review request, updates permissions and refreshes server history', () => {
    setup();
    flushLoad();
    store.transition({ status: 'UNDER_REVIEW', version: 1, reason: '' });
    store.transition({ status: 'UNDER_REVIEW', version: 1, reason: '' });
    const req = http.expectOne('/api/claims/c-1001/transition');
    expect(store.busy()).toBe(true);
    req.flush({ ...CLAIM, status: 'UNDER_REVIEW', version: 2 });
    expect(store.transitions()).toEqual(['APPROVED', 'REJECTED']);
    http.expectOne('/api/claims/c-1001/history').flush({
      items: [
        HISTORY,
        { ...HISTORY, id: 'h-2', previousStatus: 'SUBMITTED', newStatus: 'UNDER_REVIEW' },
      ],
    });
    expect(store.history().length).toBe(2);
    expect(store.busy()).toBe(false);
  });
  it('preserves claim data on conflicts and only appends server-confirmed notes', () => {
    setup();
    flushLoad();
    store.transition({ status: 'UNDER_REVIEW', version: 1, reason: '' });
    http
      .expectOne('/api/claims/c-1001/transition')
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(store.actionError()).toContain('Reload');
    expect(store.claim()?.status).toBe('SUBMITTED');
    store.addNote('New internal context');
    http
      .expectOne('/api/claims/c-1001/notes')
      .flush({ ...NOTE, id: 'n-2', content: 'New internal context' });
    expect(store.notes().length).toBe(2);
    expect(store.noteSaved()).toBe(1);
  });
  it.each([403, 404])('renders HTTP %s and supports reload', (status) => {
    setup();
    const get = http.expectOne('/api/claims/c-1001'),
      history = http.expectOne('/api/claims/c-1001/history'),
      notes = http.expectOne('/api/claims/c-1001/notes');
    get.flush({}, { status, statusText: 'Error' });
    expect(history.cancelled).toBe(true);
    expect(notes.cancelled).toBe(true);
    expect(store.error()).toContain(status === 403 ? 'permission' : 'not found');
    store.retry();
    flushLoad();
    expect(store.error()).toBe('');
  });
  it('cancels obsolete detail loads when navigating between claims', () => {
    setup();
    const old = [
      http.expectOne('/api/claims/c-1001'),
      http.expectOne('/api/claims/c-1001/history'),
      http.expectOne('/api/claims/c-1001/notes'),
    ];
    params.next(convertToParamMap({ id: 'c-1002' }));
    expect(old.every((r) => r.cancelled)).toBe(true);
    flushLoad(true, 'c-1002');
    expect(store.claim()?.id).toBe('c-1002');
  });
  it('does not let an old review response overwrite another claim after navigation', () => {
    setup();
    flushLoad();
    store.transition({ status: 'UNDER_REVIEW', version: 1, reason: '' });
    const old = http.expectOne('/api/claims/c-1001/transition');
    params.next(convertToParamMap({ id: 'c-1002' }));
    flushLoad(true, 'c-1002');
    old.flush({ ...CLAIM, status: 'UNDER_REVIEW', version: 2 });
    http.expectOne('/api/claims/c-1001/history').flush({ items: [HISTORY] });
    expect(store.claim()?.id).toBe('c-1002');
    expect(store.claim()?.status).toBe('SUBMITTED');
    expect(store.history()[0].claimId).toBe('c-1002');
  });
});
