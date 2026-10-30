import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { API_BASE_URL } from '../../../core/services/api-config';
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
  private readonly url = `${inject(API_BASE_URL)}/claims`;
  list(query: ClaimQuery) {
    return this.http.get<ClaimPage>(this.url, { params: { ...query } });
  }
  get(id: string) {
    return this.http.get<Claim>(`${this.url}/${encodeURIComponent(id)}`);
  }
  create(body: CreateClaimRequest, key: string) {
    return this.http.post<Claim>(this.url, body, { headers: { 'Idempotency-Key': key } });
  }
  transition(id: string, body: ClaimTransitionRequest) {
    return this.http.post<Claim>(`${this.url}/${encodeURIComponent(id)}/transition`, body);
  }
  history(id: string) {
    return this.http
      .get<{ items: ClaimHistory[] }>(`${this.url}/${encodeURIComponent(id)}/history`)
      .pipe(map((r) => r.items));
  }
  notes(id: string) {
    return this.http
      .get<{ items: ReviewNote[] }>(`${this.url}/${encodeURIComponent(id)}/notes`)
      .pipe(map((r) => r.items));
  }
  addNote(id: string, content: string) {
    return this.http.post<ReviewNote>(`${this.url}/${encodeURIComponent(id)}/notes`, { content });
  }
}
