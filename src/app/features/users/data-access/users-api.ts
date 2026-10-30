import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../../core/services/api-config';
import { featureHttpContext } from '../../../core/http/feature-http-context';
import { User } from '../../../shared/models/user';

interface UsersResponse {
  readonly data: readonly User[];
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/users`;

  /** ADMIN only; the API answers 403 for other roles. */
  getUsers(): Observable<readonly User[]> {
    return this.http
      .get<UsersResponse>(this.baseUrl, { context: featureHttpContext() })
      .pipe(map((response) => response.data));
  }
}
