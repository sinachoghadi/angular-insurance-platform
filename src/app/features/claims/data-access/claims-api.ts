import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../../core/services/api-config';
import { featureHttpContext } from '../../../core/http/feature-http-context';
import {
  Claim,
  ClaimHistory,
  ClaimPage,
  ClaimTransitionRequest,
  CreateClaimRequest,
  ReviewNote,
} from '../models/claim';
import { ClaimQuery } from '../models/claim-query';
@Injectable({ providedIn: 'root' })
export class ClaimsApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_BASE_URL) + '/claims';
  list(query: ClaimQuery): Observable<ClaimPage> {
    return this.http.get<ClaimPage>(this.url, {
      params: { ...query },
      context: featureHttpContext(),
    });
  }
  get(id: string): Observable<Claim> {
    return this.http.get<Claim>(this.url + '/' + encodeURIComponent(id), {
      context: featureHttpContext(),
    });
  }
  create(body: CreateClaimRequest, key: string): Observable<Claim> {
    return this.http.post<Claim>(this.url, body, {
      headers: { 'Idempotency-Key': key },
      context: featureHttpContext(),
    });
  }
  transition(id: string, body: ClaimTransitionRequest): Observable<Claim> {
    return this.http.post<Claim>(this.url + '/' + encodeURIComponent(id) + '/transition', body, {
      context: featureHttpContext(),
    });
  }
  history(id: string): Observable<ClaimHistory[]> {
    return this.http
      .get<{ items: ClaimHistory[] }>(this.url + '/' + encodeURIComponent(id) + '/history', {
        context: featureHttpContext(),
      })
      .pipe(map((r) => r.items));
  }
  notes(id: string): Observable<ReviewNote[]> {
    return this.http
      .get<{ items: ReviewNote[] }>(this.url + '/' + encodeURIComponent(id) + '/notes', {
        context: featureHttpContext(),
      })
      .pipe(map((r) => r.items));
  }
  addNote(id: string, content: string): Observable<ReviewNote> {
    return this.http.post<ReviewNote>(
      this.url + '/' + encodeURIComponent(id) + '/notes',
      { content },
      { context: featureHttpContext() },
    );
  }
}
