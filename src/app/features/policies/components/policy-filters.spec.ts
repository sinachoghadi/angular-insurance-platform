import { TestBed } from '@angular/core/testing';
import { PolicyFilters } from './policy-filters';
import { DEFAULT_QUERY } from '../models/policy-query';
describe('PolicyFilters', () => {
  it('commits pending search together with a changed filter', async () => {
    const fixture = TestBed.createComponent(PolicyFilters);
    fixture.componentRef.setInput('query', DEFAULT_QUERY);
    await fixture.whenStable();
    const change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    vi.useFakeTimers();
    fixture.componentInstance.form.controls.search.setValue('Demo');
    fixture.componentInstance.form.controls.status.setValue('ACTIVE');
    expect(change).toHaveBeenCalledWith({ status: 'ACTIVE', search: 'Demo' });
    fixture.componentRef.setInput('query', { ...DEFAULT_QUERY, status: 'ACTIVE', search: 'Demo' });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    expect(change).toHaveBeenCalledTimes(1);
  });
  afterEach(() => vi.useRealTimers());
  async function setup() {
    const fixture = TestBed.createComponent(PolicyFilters);
    fixture.componentRef.setInput('query', DEFAULT_QUERY);
    await fixture.whenStable();
    return fixture;
  }
  it('debounces search by 300ms and emits only the latest distinct value', async () => {
    const fixture = await setup();
    const change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    vi.useFakeTimers();
    const search = fixture.componentInstance.form.controls.search;
    search.setValue('Alex');
    await vi.advanceTimersByTimeAsync(200);
    search.setValue('Taylor');
    await vi.advanceTimersByTimeAsync(299);
    expect(change).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(change).toHaveBeenCalledExactlyOnceWith({ search: 'Taylor' });
    fixture.componentRef.setInput('query', { ...DEFAULT_QUERY, search: 'Taylor' });
    fixture.detectChanges();
    search.setValue('Taylor');
    await vi.advanceTimersByTimeAsync(300);
    expect(change).toHaveBeenCalledTimes(1);
  });
  it('restores form controls without triggering a URL update', async () => {
    const fixture = await setup();
    const change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    fixture.componentRef.setInput('query', {
      ...DEFAULT_QUERY,
      search: 'Alex',
      status: 'ACTIVE',
      startFrom: '2025-01-01',
    });
    await fixture.whenStable();
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      search: 'Alex',
      status: 'ACTIVE',
      startFrom: '2025-01-01',
    });
    expect(change).not.toHaveBeenCalled();
  });
  it('allows the same search again after URL restoration and cancels pending input on clear', async () => {
    const fixture = await setup();
    const change = vi.fn();
    fixture.componentInstance.change.subscribe(change);
    vi.useFakeTimers();
    fixture.componentInstance.form.controls.search.setValue('Alex');
    await vi.advanceTimersByTimeAsync(300);
    fixture.componentRef.setInput('query', { ...DEFAULT_QUERY, search: 'Alex' });
    fixture.detectChanges();
    fixture.componentRef.setInput('query', DEFAULT_QUERY);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.search.setValue('Alex');
    await vi.advanceTimersByTimeAsync(300);
    expect(change).toHaveBeenCalledTimes(2);
    fixture.componentInstance.form.controls.search.setValue('pending');
    fixture.componentRef.setInput('query', { ...DEFAULT_QUERY });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    expect(change).toHaveBeenCalledTimes(2);
  });
});
