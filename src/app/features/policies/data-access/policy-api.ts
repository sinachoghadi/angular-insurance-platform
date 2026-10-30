import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/services/api-config';
import { featureHttpContext } from '../../../core/http/feature-http-context';
import { Policy, PolicyPage } from '../models/policy';
import { PolicyQuery } from '../models/policy-query';
import { DraftRequest } from '../models/policy-form';
@Injectable({ providedIn: 'root' })
export class PolicyApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_BASE_URL) + '/policies';
  list(query: PolicyQuery): Observable<PolicyPage> {
    return this.http.get<PolicyPage>(this.url, {
      params: { ...query },
      context: featureHttpContext(),
    });
  }
  get(id: string): Observable<Policy> {
    return this.http.get<Policy>(this.url + '/' + encodeURIComponent(id), {
      context: featureHttpContext(),
    });
  }
  create(body: DraftRequest, key: string): Observable<Policy> {
    return this.http.post<Policy>(this.url, body, {
      headers: { 'Idempotency-Key': key },
      context: featureHttpContext(),
    });
  }
  update(id: string, body: DraftRequest): Observable<Policy> {
    return this.http.patch<Policy>(this.url + '/' + encodeURIComponent(id), body, {
      context: featureHttpContext(),
    });
  }
  submit(id: string, version: number): Observable<Policy> {
    return this.http.post<Policy>(
      this.url + '/' + encodeURIComponent(id) + '/submit',
      { version },
      { context: featureHttpContext() },
    );
  }
  discard(id: string, version: number): Observable<void> {
    return this.http.delete<void>(this.url + '/' + encodeURIComponent(id), {
      body: { version },
      context: featureHttpContext(),
    });
  }
}
