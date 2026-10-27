import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FeaturePlaceholder } from './feature-placeholder';

describe('FeaturePlaceholder', () => {
  let fixture: ComponentFixture<FeaturePlaceholder>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [FeaturePlaceholder] });

    fixture = TestBed.createComponent(FeaturePlaceholder);
    fixture.componentRef.setInput('icon', 'dashboard');
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('hides the planned capabilities list when there are no items', () => {
    expect(element.querySelector('ul')).toBeNull();
  });

  it('lists planned capabilities', async () => {
    fixture.componentRef.setInput('plannedItems', ['Search', 'Filters']);
    await fixture.whenStable();

    const items = Array.from(element.querySelectorAll('li')).map((li) => li.textContent);
    expect(items).toEqual(['Search', 'Filters']);
  });
});
