import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Below this width the sidebar becomes an overlay drawer. */
const COMPACT_QUERY = '(max-width: 959.98px)';

@Injectable({ providedIn: 'root' })
export class Viewport {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isCompact: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(COMPACT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(COMPACT_QUERY) },
  );
}
