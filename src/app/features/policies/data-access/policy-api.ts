import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../core/services/api-config';
import { Policy, PolicyPage } from '../models/policy';
import { PolicyQuery } from '../models/policy-query';
import { DraftRequest } from '../models/policy-form';
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
  create(body: DraftRequest, key: string) {
    return this.http.post<Policy>(this.url, body, { headers: { 'Idempotency-Key': key } });
  }
  update(id: string, body: DraftRequest) {
    return this.http.patch<Policy>(`${this.url}/${encodeURIComponent(id)}`, body);
  }
  submit(id: string, version: number) {
    return this.http.post<Policy>(`${this.url}/${encodeURIComponent(id)}/submit`, { version });
  }
  discard(id: string, version: number) {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`, { body: { version } });
  }
}
