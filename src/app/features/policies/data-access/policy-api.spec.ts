import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PolicyApi } from './policy-api';
import { DEFAULT_QUERY } from '../models/policy-query';
describe('PolicyApi', () => {
  let api: PolicyApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PolicyApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends pagination, combined filters, search and sorting to the server', () => {
    const query = {
      ...DEFAULT_QUERY,
      page: 2,
      pageSize: 25,
      search: 'Alex',
      status: 'ACTIVE',
      insuranceType: 'Life',
      agentId: 'u-1002',
      startFrom: '2025-01-01',
      sortBy: 'premium' as const,
      sortOrder: 'asc' as const,
    };
    const next = vi.fn();
    api.list(query).subscribe(next);
    const req = http.expectOne((r) => r.url === '/api/policies');
    for (const [key, value] of Object.entries(query))
      expect(req.request.params.get(key)).toBe(String(value));
    const page = { items: [], total: 33, page: 2, pageSize: 25 };
    req.flush(page);
    expect(next).toHaveBeenCalledWith(page);
  });
  it('loads details by ID and propagates forbidden errors', () => {
    const error = vi.fn();
    api.get('p-1002').subscribe({ error });
    http.expectOne('/api/policies/p-1002').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(error.mock.calls[0][0].status).toBe(403);
  });
});
