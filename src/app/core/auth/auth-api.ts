import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../services/api-config';
import { SKIP_SESSION_HANDLING } from '../interceptors/http-context';
import { LoginCredentials, SessionResponse } from './auth-models';

/** HTTP access to the `/auth` endpoints. Holds no state; see `AuthStore`. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/auth`;

  login(credentials: LoginCredentials): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/login`, credentials, {
      context: selfHandled(),
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, null, { context: selfHandled() });
  }

  me(): Observable<SessionResponse> {
    return this.http.get<SessionResponse>(`${this.baseUrl}/me`, { context: selfHandled() });
  }
}

function selfHandled(): HttpContext {
  return new HttpContext().set(SKIP_SESSION_HANDLING, true);
}
