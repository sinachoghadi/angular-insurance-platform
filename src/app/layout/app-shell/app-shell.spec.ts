import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NAV_ITEMS } from '../navigation';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(AppShell);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renders the header, navigation, and main landmark', () => {
    expect(element.querySelector('app-header')).not.toBeNull();
    expect(element.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(element.querySelector('main')).not.toBeNull();
  });

  it('renders one link per navigation item', () => {
    expect(element.querySelectorAll('nav a').length).toBe(NAV_ITEMS.length);
  });

  it('toggles the navigation from the header menu button', async () => {
    const menuButton = element.querySelector<HTMLButtonElement>('app-header button')!;
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    menuButton.click();
    await fixture.whenStable();

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('moves focus to the main content from the skip link', () => {
    element.querySelector<HTMLButtonElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(element.querySelector('main'));
  });
});
