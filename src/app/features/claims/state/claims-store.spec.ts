import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ClaimsStore } from './claims-store';
import { DEFAULT_CLAIM_QUERY, parseClaimQuery } from '../models/claim-query';
import { CLAIM } from '../testing/claim-fixtures';
describe('ClaimsStore and query restoration', () => {
  let store: ClaimsStore,
    http: HttpTestingController,
    params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    params = new BehaviorSubject(
      convertToParamMap({
        page: 2,
        pageSize: 25,
        status: 'APPROVED',
        sortBy: 'estimatedAmount',
        sortOrder: 'asc',
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        ClaimsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ClaimsStore);
  });
  afterEach(() => http.verify());
  const request = () => http.expectOne((r) => r.url === '/api/claims');
  it('restores URL state and exposes loading/result/empty states', () => {
    expect(store.loading()).toBe(true);
    expect(store.query().page).toBe(2);
    request().flush({ items: [CLAIM], total: 90, page: 2, pageSize: 25 });
    expect(store.result().items).toEqual([CLAIM]);
    expect(store.loading()).toBe(false);
  });
  it('cancels obsolete requests and accepts back/forward query restoration', () => {
    const old = request();
    params.next(convertToParamMap({ search: 'Demo' }));
    expect(old.cancelled).toBe(true);
    request().flush({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(store.empty()).toBe(true);
    params.next(
      convertToParamMap({
        page: 2,
        pageSize: 25,
        status: 'APPROVED',
        sortBy: 'estimatedAmount',
        sortOrder: 'asc',
      }),
    );
    expect(store.query().sortBy).toBe('estimatedAmount');
    request().flush({ items: [CLAIM], total: 90, page: 2, pageSize: 25 });
  });
  it('recovers from list failures with retry', () => {
    request().flush({}, { status: 500, statusText: 'Error' });
    expect(store.error()).toBe(true);
    expect(store.loading()).toBe(false);
    store.retry();
    expect(store.error()).toBe(false);
    request().flush({ items: [], total: 0, page: 2, pageSize: 25 });
    expect(store.empty()).toBe(true);
  });
  it('resets page on filter changes and preserves sorting on pagination', () => {
    request().flush({ items: [], total: 90, page: 2, pageSize: 25 });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.update({ claimType: 'Fire' });
    expect(navigate.mock.calls[0][1]?.queryParams).toMatchObject({
      page: 1,
      claimType: 'Fire',
      sortBy: 'estimatedAmount',
    });
    store.update({ page: 3 }, false);
    expect(navigate.mock.calls[1][1]?.queryParams).toMatchObject({
      page: 3,
      pageSize: 25,
      sortOrder: 'asc',
    });
  });
  it('normalizes unsafe query values', () => {
    request().flush({ items: [], total: 0, page: 2, pageSize: 25 });
    expect(
      parseClaimQuery(
        convertToParamMap({
          page: '-1',
          pageSize: 999,
          sortBy: 'secret',
          status: 'bad',
          claimType: 'bad',
          dateFrom: '2026-02-31',
        }),
      ),
    ).toEqual(DEFAULT_CLAIM_QUERY);
  });
  it('does not issue a second GET for a server-clamped URL and preserves manual retry', () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    request().flush({ items: [], total: 1, page: 1, pageSize: 25 });
    params.next(
      convertToParamMap({
        page: 1,
        pageSize: 25,
        status: 'APPROVED',
        sortBy: 'estimatedAmount',
        sortOrder: 'asc',
      }),
    );
    http.expectNone((r) => r.url === '/api/claims');
    store.retry();
    request().flush({ items: [], total: 1, page: 1, pageSize: 25 });
  });
  it('merges rapid independent filters before URL commit', () => {
    request().flush({ items: [], total: 90, page: 2, pageSize: 25 });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.update({ status: 'REJECTED' });
    store.update({ claimType: 'Fire' });
    expect(navigate.mock.calls[1][1]?.queryParams).toMatchObject({
      status: 'REJECTED',
      claimType: 'Fire',
      page: 1,
    });
  });
});
