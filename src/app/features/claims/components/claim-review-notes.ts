import { DatePipe } from '@angular/common';
import { Component, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { ReviewNote } from '../models/claim';
@Component({
  selector: 'app-claim-review-notes',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatButton,
  ],
  template: `<h2>Internal review notes</h2>
    <p>Admin-only. These notes are never shared with Agents.</p>
    @for (note of notes(); track note.id) {
      <article>
        <strong>{{ note.authorName }}</strong
        ><small>{{ note.createdAt | date: 'medium' : 'UTC' }} UTC</small>
        <p class="content">{{ note.content }}</p>
      </article>
    } @empty {
      <p>No internal notes yet.</p>
    }
    <mat-form-field
      ><mat-label>New internal note</mat-label
      ><textarea
        matInput
        rows="4"
        maxlength="2000"
        [formControl]="content"
        [readonly]="busy()"
      ></textarea
      ><mat-hint>3–2000 characters.</mat-hint
      ><mat-error>Enter at least 3 non-whitespace characters.</mat-error></mat-form-field
    ><button
      mat-stroked-button
      [disabled]="busy() || content.invalid"
      (click)="add.emit(content.value.trim())"
    >
      Add internal note
    </button>`,
  styles: [
    `
      h2 {
        font-size: 18px;
      }
      mat-form-field {
        width: 100%;
        display: block;
        margin-block: 16px;
      }
      article {
        padding-block: 16px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }
      small {
        display: block;
        margin-top: 4px;
        color: var(--mat-sys-on-surface-variant);
      }
      .content {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class ClaimReviewNotes {
  readonly notes = input.required<ReviewNote[]>();
  readonly busy = input(false);
  readonly savedSequence = input(0);
  readonly add = output<string>();
  readonly content = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(2000),
      (c) => (typeof c.value === 'string' && c.value.trim().length >= 3 ? null : { note: true }),
    ],
  });
  constructor() {
    effect(() => {
      if (this.savedSequence() > 0) this.content.reset('');
    });
  }
}
