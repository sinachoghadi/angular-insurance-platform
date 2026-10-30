import { TestBed } from '@angular/core/testing';
import { ClaimReviewNotes } from './claim-review-notes';
import { NOTE } from '../testing/claim-fixtures';
describe('ClaimReviewNotes', () => {
  it('validates content, preserves unsaved notes and clears only on confirmed success', async () => {
    const fixture = TestBed.createComponent(ClaimReviewNotes);
    fixture.componentRef.setInput('notes', [NOTE]);
    await fixture.whenStable();
    const component = fixture.componentInstance,
      add = vi.fn();
    component.add.subscribe(add);
    component.content.setValue('   ');
    expect(component.content.invalid).toBe(true);
    component.content.setValue('New internal context');
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(add).toHaveBeenCalledWith('New internal context');
    expect(component.content.value).toBe('New internal context');
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('textarea')?.readOnly).toBe(true);
    fixture.componentRef.setInput('savedSequence', 1);
    await fixture.whenStable();
    expect(component.content.value).toBe('');
  });
});
