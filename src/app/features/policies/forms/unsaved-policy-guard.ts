import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs';
import { DraftConfirm } from '../components/draft-confirm';
import type { PolicyFormPage } from '../pages/policy-form/policy-form-page';
export const unsavedPolicyGuard: CanDeactivateFn<PolicyFormPage> = (component) => {
  if (component.store.busy()) return false;
  if (!component.store.dirty()) return true;
  return inject(MatDialog)
    .open(DraftConfirm, {
      data: {
        title: 'Leave with unsaved changes?',
        message:
          'Changes since the last save will be lost. Your saved draft will remain available.',
        action: 'Leave page',
      },
    })
    .afterClosed()
    .pipe(map((result) => result === true));
};
