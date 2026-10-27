import { Component, input } from '@angular/core';

/** Page title block. Projected content is rendered as right-aligned page actions. */
@Component({
  selector: 'app-page-header',
  styleUrl: './page-header.scss',
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly description = input<string>();
}
