import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  let fixture: ComponentFixture<PageHeader>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PageHeader] });

    fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('heading', 'Policies');
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renders the heading as the page h1', () => {
    expect(element.querySelector('h1')?.textContent).toBe('Policies');
  });

  it('only renders a description when one is provided', async () => {
    expect(element.querySelector('p')).toBeNull();

    fixture.componentRef.setInput('description', 'Manage policies');
    await fixture.whenStable();

    expect(element.querySelector('p')?.textContent).toBe('Manage policies');
  });
});
