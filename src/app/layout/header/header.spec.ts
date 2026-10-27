import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
