import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/services/api-config';
import { Policy, PolicyPage } from '../models/policy';
import { PolicyQuery } from '../models/policy-query';
@Injectable({ providedIn: 'root' })
export class PolicyApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/policies`;
  list(query: PolicyQuery) {
    return this.http.get<PolicyPage>(this.url, { params: { ...query } });
  }
  get(id: string) {
    return this.http.get<Policy>(`${this.url}/${encodeURIComponent(id)}`);
  }
}
