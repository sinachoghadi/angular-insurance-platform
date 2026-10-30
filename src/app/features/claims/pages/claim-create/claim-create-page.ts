import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator } from '@angular/material/paginator';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ClaimCreateStore } from '../../state/claim-create-store';
import { CLAIM_TYPES } from '../../models/claim';
@Component({
  selector: 'app-claim-create',
  providers: [ClaimCreateStore],
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatSelect,
    MatOption,
    MatInput,
    MatButton,
    MatProgressBar,
    MatPaginator,
    PageHeader,
  ],
  templateUrl: './claim-create-page.html',
  styleUrl: './claim-create-page.scss',
})
export class ClaimCreatePage {
  readonly store = inject(ClaimCreateStore);
  readonly types = CLAIM_TYPES;
  readonly today = new Date().toISOString().slice(0, 10);
}
