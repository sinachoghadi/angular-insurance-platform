import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClaimTransitionDialog } from './claim-transition-dialog';
import { ClaimStatus } from '../models/claim';
import { CLAIM } from '../testing/claim-fixtures';
describe('ClaimTransitionDialog', () => {
  function setup(target: ClaimStatus) {
    const close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { claim: { ...CLAIM, status: 'UNDER_REVIEW', version: 2 }, target },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(ClaimTransitionDialog);
    fixture.detectChanges();
    return { fixture, close, dialog: fixture.componentInstance };
  }
  it('requires a meaningful rejection reason before confirmation', () => {
    const { dialog, close } = setup('REJECTED');
    dialog.confirm();
    expect(close).not.toHaveBeenCalled();
    dialog.form.controls.reason.setValue('   ');
    expect(dialog.form.invalid).toBe(true);
    dialog.form.controls.reason.setValue('  Insufficient supporting information.  ');
    dialog.confirm();
    expect(close).toHaveBeenCalledWith({
      status: 'REJECTED',
      version: 2,
      reason: 'Insufficient supporting information.',
    });
  });
  it('validates approved amounts and sends the reviewed version', () => {
    const { dialog, close } = setup('APPROVED');
    dialog.form.controls.approvedAmount.setValue(1001);
    dialog.confirm();
    expect(close).not.toHaveBeenCalled();
    dialog.form.controls.approvedAmount.setValue(500);
    dialog.confirm();
    expect(close).toHaveBeenCalledWith({
      status: 'APPROVED',
      version: 2,
      reason: '',
      approvedAmount: 500,
    });
  });
});
