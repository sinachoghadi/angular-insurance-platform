import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth-store';
import { FORBIDDEN, UNAUTHORIZED } from '../auth/testing/auth-fixtures';
import { FORBIDDEN_MESSAGE, errorInterceptor } from './error-interceptor';
import { SKIP_SESSION_HANDLING, HANDLE_API_ERROR_LOCALLY } from './http-context';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const authStore = { handleUnauthorized: vi.fn() };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    authStore.handleUnauthorized.mockReset();
    snackBar.open.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: authStore },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  async function failWith(
    url: string,
    status: { status: number; statusText: string },
    context?: HttpContext,
  ): Promise<HttpErrorResponse> {
    const response = firstValueFrom(http.get(url, { context }));
    controller.expectOne(url).flush({ message: 'error' }, status);
    return response.then(
      () => {
        throw new Error('Expected the request to fail');
      },
      (error: HttpErrorResponse) => error,
    );
  }

  it('ends the session on 401 and re-throws the error', async () => {
    const error = await failWith('/api/users', UNAUTHORIZED);

    expect(error.status).toBe(401);
    expect(authStore.handleUnauthorized).toHaveBeenCalledTimes(1);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('keeps the session on 403 and shows a permission message', async () => {
    const error = await failWith('/api/users', FORBIDDEN);

    expect(error.status).toBe(403);
    expect(authStore.handleUnauthorized).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(FORBIDDEN_MESSAGE, 'Dismiss', expect.any(Object));
  });

  it('leaves self-handled auth requests to their caller', async () => {
    const context = new HttpContext().set(SKIP_SESSION_HANDLING, true);

    await failWith('/api/auth/login', UNAUTHORIZED, context);

    expect(authStore.handleUnauthorized).not.toHaveBeenCalled();
  });

  it('ignores errors from non-API requests', async () => {
    await failWith('https://cdn.example.com/data.json', UNAUTHORIZED);
    await failWith('https://cdn.example.com/data.json', FORBIDDEN);

    expect(authStore.handleUnauthorized).not.toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('does not handle other error statuses', async () => {
    await failWith('/api/users', { status: 500, statusText: 'Server Error' });

    expect(authStore.handleUnauthorized).not.toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });
  it('avoids duplicate feature error notifications without skipping session expiry', async () => {
    const context = new HttpContext().set(HANDLE_API_ERROR_LOCALLY, true);
    await failWith('/api/policies', FORBIDDEN, context);
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(authStore.handleUnauthorized).not.toHaveBeenCalled();
    await failWith('/api/policies', UNAUTHORIZED, context);
    expect(authStore.handleUnauthorized).toHaveBeenCalledOnce();
  });
});
