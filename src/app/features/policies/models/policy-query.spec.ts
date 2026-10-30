import { convertToParamMap } from '@angular/router';
import { DEFAULT_QUERY, parseQuery } from './policy-query';
describe('Policy query restoration', () => {
  it('restores all shareable listing state', () => {
    const query = {
      ...DEFAULT_QUERY,
      page: 3,
      pageSize: 25,
      search: 'Alex',
      status: 'ACTIVE',
      insuranceType: 'Life',
      agentId: 'u-1002',
      startFrom: '2025-01-01',
      startTo: '2026-12-31',
      sortBy: 'premium' as const,
      sortOrder: 'asc' as const,
    };
    expect(parseQuery(convertToParamMap(query), true)).toEqual(query);
  });
  it('uses defaults for unsafe values and removes agent filters for agents', () => {
    expect(
      parseQuery(
        convertToParamMap({
          page: '-3',
          pageSize: '1000000',
          sortBy: 'secret',
          sortOrder: 'bad',
          status: 'bad',
          insuranceType: 'bad',
          agentId: 'u-1003',
          startFrom: '2025-02-31',
        }),
        false,
      ),
    ).toEqual(DEFAULT_QUERY);
  });
});
