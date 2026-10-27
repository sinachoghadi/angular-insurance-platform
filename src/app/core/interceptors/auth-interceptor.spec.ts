import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function sentWithCredentials(url: string): boolean {
    http.get(url).subscribe();
    const request = controller.expectOne(url);
    request.flush({});
    return request.request.withCredentials;
  }

  it('sends credentials with API requests', () => {
    expect(sentWithCredentials('/api/users')).toBe(true);
    expect(sentWithCredentials('/api/auth/me')).toBe(true);
  });

  it.each([
    'https://cdn.example.com/data.json',
    'https://evil.example/api/users',
    '//evil.example/api/users',
    '/apix/users',
    '/assets/config.json',
  ])('does not send credentials to %s', (url) => {
    expect(sentWithCredentials(url)).toBe(false);
  });
});
