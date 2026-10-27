import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ADMIN_USER, AGENT_USER, FORBIDDEN } from '../../../../core/auth/testing/auth-fixtures';
import { UsersPage } from './users-page';

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsersPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows a loading state, then the users returned by the API', async () => {
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading users');

    http.expectOne('/api/users').flush({ data: [ADMIN_USER, AGENT_USER] });
    await fixture.whenStable();

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Avery Admin', 'admin@demo.com', 'Administrator'],
      ['Jordan Agent', 'agent@demo.com', 'Agent'],
    ]);
  });

  it('shows an error state when the API refuses the request', async () => {
    http.expectOne('/api/users').flush({ message: 'Forbidden' }, FORBIDDEN);
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Users could not be loaded',
    );
  });
});
