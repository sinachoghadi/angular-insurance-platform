import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AGENT_USER } from '../../core/auth/testing/auth-fixtures';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('appName', 'Insurance Portal');
    fixture.componentRef.setInput('navigationId', 'nav');
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const accountButton = () => element.querySelector<HTMLButtonElement>('.header__account');

  it('shows the application name', () => {
    expect(element.textContent).toContain('Insurance Portal');
  });

  it('describes the controlled navigation for assistive technology', async () => {
    fixture.componentRef.setInput('navigationOpen', true);
    await fixture.whenStable();

    const button = element.querySelector('button')!;
    expect(button.getAttribute('aria-controls')).toBe('nav');
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('emits menuToggle when the menu button is clicked', () => {
    let toggled = 0;
    fixture.componentInstance.menuToggle.subscribe(() => toggled++);

    element.querySelector('button')!.click();

    expect(toggled).toBe(1);
  });

  it('hides the account menu when nobody is signed in', () => {
    expect(accountButton()).toBeNull();
  });

  describe('with a signed-in user', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('user', AGENT_USER);
      await fixture.whenStable();
    });

    it("shows the user's name, role, and initials", () => {
      const button = accountButton()!;

      expect(button.textContent).toContain('Jordan Agent');
      expect(button.textContent).toContain('Agent');
      expect(button.querySelector('.header__avatar')?.textContent).toBe('JA');
      expect(button.getAttribute('aria-label')).toBe('Account menu for Jordan Agent, Agent');
    });

    it('emits logout from the account menu', async () => {
      let loggedOut = 0;
      fixture.componentInstance.logout.subscribe(() => loggedOut++);

      accountButton()!.click();
      await fixture.whenStable();
      document.querySelector<HTMLButtonElement>('[mat-menu-item]')!.click();

      expect(loggedOut).toBe(1);
    });
  });
});
