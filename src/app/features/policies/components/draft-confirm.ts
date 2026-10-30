import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
@Component({
  selector: 'app-draft-confirm',
  imports: [MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle, MatButton],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button mat-button [mat-dialog-close]="false">Keep editing</button
      ><button mat-button [mat-dialog-close]="true">{{ data.action }}</button></mat-dialog-actions
    >`,
})
export class DraftConfirm {
  readonly data = inject<{ title: string; message: string; action: string }>(MAT_DIALOG_DATA);
}
