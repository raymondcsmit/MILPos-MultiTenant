import { Component, Inject, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialYear } from '../financial-year';
import { RouterModule } from '@angular/router';
import { FinancialYearStore } from '../financial-year-store';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BaseComponent } from '../../../base.component';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatCardModule } from "@angular/material/card";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { toObservable } from '@angular/core/rxjs-interop';
import { FinancialYearService } from '../financial-year.service';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-manage-financial-year',
  imports: [
    FormsModule,
    TranslateModule,
    RouterModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatIconModule,
    PageHelpTextComponent,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './manage-financial-year.component.html',
  styleUrl: './manage-financial-year.component.scss'
})
export class ManageFinancialYearComponent extends BaseComponent implements OnInit {
  financialYear!: FinancialYear;
  financialYearForm!: FormGroup;
  private fb = inject(FormBuilder);
  private financialYearService = inject(FinancialYearService);
  public financialYearStore = inject(FinancialYearStore);
  private toastrService = inject(ToastrService);

  constructor(
    private dialogRef: MatDialogRef<ManageFinancialYearComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string,
  ) {
    super();
    this.subscribeIsAddUpdate();
  }

  ngOnInit(): void {
    this.createFinancialYearForm();
    this.getFinancialYear();
  }

  getFinancialYear() {
    this.financialYearService.getFinancialYear(this.data).subscribe((data) => {
      if (data) {
        this.financialYearForm.patchValue(data);
        this.financialYear = data;
      }
    });
  }

  createFinancialYearForm() {
    this.financialYearForm = this.fb.group({
      id: [''],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
    });
  }

  saveFinancialYear() {
    if (!this.financialYearForm.valid) {
      this.financialYearForm.markAllAsTouched();
      return;
    }
    const financialYear: FinancialYear = this.financialYearForm.getRawValue();

    this.financialYearStore.addUpdateFinancialYear(financialYear);
  }

  close() {
    this.dialogRef.close();
  }

  subscribeIsAddUpdate() {
    toObservable(this.financialYearStore.isAddUpdate).subscribe((flag) => {
      if (flag) {
        this.dialogRef.close(true);
      }
      this.financialYearStore.resetflag();
    });
  }
}

