import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AppTitleStrategy } from './core/services/app-title-strategy';

describe('App routing', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: TitleStrategy, useClass: AppTitleStrategy }],
    });
    harness = await RouterTestingHarness.create();
  });

  const heading = () =>
    (harness.routeNativeElement as HTMLElement).querySelector('h1')?.textContent?.trim();

  it('redirects the root path to the dashboard', async () => {
    await harness.navigateByUrl('/');

    expect(TestBed.inject(Title).getTitle()).toBe('Dashboard | Insurance Portal');
    expect(heading()).toBe('Dashboard');
  });

  it.each([
    ['/policies', 'Policies'],
    ['/claims', 'Claims'],
    ['/users', 'Users'],
  ])('lazy-loads %s', async (url, expectedHeading) => {
    await harness.navigateByUrl(url);

    expect(heading()).toBe(expectedHeading);
  });

  it('renders the not found page for unknown URLs', async () => {
    await harness.navigateByUrl('/does-not-exist');

    expect(heading()).toBe('Page not found');
    expect(TestBed.inject(Title).getTitle()).toBe('Page not found | Insurance Portal');
  });
});
