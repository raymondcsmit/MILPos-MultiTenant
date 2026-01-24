import { Component, Inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-manage-expense-category',
  templateUrl: './manage-expense-category.component.html',
  styleUrls: ['./manage-expense-category.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    TranslateModule,
    HasClaimDirective,
    MatCardModule,
    MatDialogModule
  ]
})
export class ManageExpenseCategoryComponent
  extends BaseComponent
  implements OnInit {
  isEdit: boolean = false;
  expenseCategoryForm!: UntypedFormGroup;
  constructor(
    public dialogRef: MatDialogRef<ManageExpenseCategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExpenseCategory,
    private expenseCategoryService: ExpenseCategoryService,
    private toastrService: ToastrService,
    private fb: UntypedFormBuilder
  ) {
    super();
  }
  ngOnInit(): void {
    this.createForm();
    if (this.data.id) {
      this.expenseCategoryForm.patchValue(this.data);
      this.isEdit = true;
    }
  }

  createForm() {
    this.expenseCategoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  saveExpenseCategory(): void {
    if (!this.expenseCategoryForm.valid) {
      this.expenseCategoryForm.markAllAsTouched();
      return;
    }
    const expenseCategory: ExpenseCategory = this.expenseCategoryForm.value;

    if (this.data && this.data.id) {
      this.expenseCategoryService
        .update(this.data.id, expenseCategory)
        .subscribe((category) => {
          this.toastrService.success(
            this.translationService.getValue(
              'EXPENSE_CATEGORY_SAVED_SUCCESSFULLY'
            )
          );
          this.dialogRef.close(category);
        });
    } else {
      this.expenseCategoryService.add(expenseCategory).subscribe((category) => {
        this.toastrService.success(
          this.translationService.getValue(
            'EXPENSE_CATEGORY_SAVED_SUCCESSFULLY'
          )
        );
        this.dialogRef.close(category);
      });
    }
  }
}
