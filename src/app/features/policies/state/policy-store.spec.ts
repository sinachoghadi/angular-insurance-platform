import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth-store';
import { PolicyStore } from './policy-store';
describe('PolicyStore', () => {
  let store: PolicyStore;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    params = new BehaviorSubject(
      convertToParamMap({ page: '2', pageSize: '25', status: 'ACTIVE' }),
    );
    TestBed.configureTestingModule({
      providers: [
        PolicyStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthStore, useValue: { role: () => 'ADMIN' } },
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PolicyStore);
  });
  afterEach(() => http.verify());
  const request = () => http.expectOne((r) => r.url === '/api/policies');
  it('restores query, exposes loading and derives empty state', () => {
    expect(store.loading()).toBe(true);
    expect(store.query().page).toBe(2);
    request().flush({ items: [], total: 0, page: 2, pageSize: 25 });
    expect(store.loading()).toBe(false);
    expect(store.empty()).toBe(true);
  });
  it('cancels obsolete requests and restores browser navigation state', () => {
    const old = request();
    params.next(
      convertToParamMap({ page: 1, search: 'Taylor', sortBy: 'premium', sortOrder: 'asc' }),
    );
    expect(old.cancelled).toBe(true);
    const current = request();
    expect(current.request.params.get('search')).toBe('Taylor');
    current.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    params.next(convertToParamMap({ page: 2, pageSize: 25, status: 'ACTIVE' }));
    expect(store.query().page).toBe(2);
    expect(store.query().search).toBe('');
    request().flush({ items: [], total: 0, page: 2, pageSize: 25 });
  });
  it('recovers from errors through retry', () => {
    request().flush({}, { status: 500, statusText: 'Server error' });
    expect(store.error()).toBe(true);
    expect(store.loading()).toBe(false);
    store.retry();
    expect(store.loading()).toBe(true);
    expect(store.error()).toBe(false);
    request().flush({ items: [], total: 0, page: 2, pageSize: 25 });
    expect(store.empty()).toBe(true);
  });
  it('resets page on filters and retains sort across pagination', () => {
    request().flush({ items: [], total: 100, page: 2, pageSize: 25 });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.update({ search: 'Alex' });
    expect(navigate.mock.calls[0][1]?.queryParams).toMatchObject({
      page: 1,
      search: 'Alex',
      status: 'ACTIVE',
    });
    store.update({ page: 3 }, false);
    expect(navigate.mock.calls[1][1]?.queryParams).toMatchObject({
      page: 3,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      pageSize: 25,
    });
  });
});
