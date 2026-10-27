import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavItem } from '../../shared/models/nav-item';
import { Sidebar } from './sidebar';

@Component({ template: '' })
class Blank {}

const ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Claims', icon: 'assignment', route: '/claims' },
];

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });

    fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('items', ITEMS);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renders a link for each item', () => {
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/claims']);
  });

  it('marks the active route with aria-current', async () => {
    await TestBed.inject(Router).navigateByUrl('/claims');
    await fixture.whenStable();

    const active = element.querySelector('a[aria-current="page"]');
    expect(active?.textContent).toContain('Claims');
  });

  it('emits navigated when a link is clicked', () => {
    let navigated = 0;
    fixture.componentInstance.navigated.subscribe(() => navigated++);

    element.querySelector('a')!.click();

    expect(navigated).toBe(1);
  });
});
