import { TestBed } from '@angular/core/testing';
import { ClaimFilters } from './claim-filters';
import { DEFAULT_CLAIM_QUERY } from '../models/claim-query';
describe('ClaimFilters', () => {
  afterEach(() => vi.useRealTimers());
  async function setup() {
    const fixture = TestBed.createComponent(ClaimFilters);
    fixture.componentRef.setInput('query', DEFAULT_CLAIM_QUERY);
    await fixture.whenStable();
    return fixture;
  }
  it('debounces for 300ms, deduplicates and restores URL controls without loops', async () => {
    const fixture = await setup(),
      change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    vi.useFakeTimers();
    fixture.componentInstance.form.controls.search.setValue('CLM');
    await vi.advanceTimersByTimeAsync(200);
    fixture.componentInstance.form.controls.search.setValue('Demo');
    await vi.advanceTimersByTimeAsync(299);
    expect(change).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(change).toHaveBeenCalledExactlyOnceWith({ search: 'Demo' });
    fixture.componentRef.setInput('query', {
      ...DEFAULT_CLAIM_QUERY,
      search: 'Demo',
      status: 'APPROVED',
    });
    fixture.detectChanges();
    fixture.componentInstance.form.controls.search.setValue('Demo');
    await vi.advanceTimersByTimeAsync(300);
    expect(change).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.form.controls.status.value).toBe('APPROVED');
  });
  it('does not replay an obsolete pending search after clearing the URL', async () => {
    const fixture = await setup(),
      change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    vi.useFakeTimers();
    fixture.componentInstance.form.controls.search.setValue('obsolete');
    fixture.componentRef.setInput('query', { ...DEFAULT_CLAIM_QUERY });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    expect(change).not.toHaveBeenCalled();
  });
});
