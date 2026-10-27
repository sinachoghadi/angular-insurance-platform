import { Component, input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

/** Temporary "under construction" panel for feature pages that are not built yet. */
@Component({
  selector: 'app-feature-placeholder',
  imports: [MatCard, MatCardContent, MatIcon],
  styleUrl: './feature-placeholder.scss',
  templateUrl: './feature-placeholder.html',
})
export class FeaturePlaceholder {
  readonly icon = input.required<string>();
  readonly heading = input('This module is under construction');
  readonly plannedItems = input<readonly string[]>([]);
}
