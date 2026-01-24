import { Component, OnInit } from '@angular/core';
import { ExpenseCategory } from '@core/domain-classes/expense-category';
import { ExpenseCategoryService } from '@core/services/expense-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { BaseComponent } from '../../base.component';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { ManageExpenseCategoryComponent } from '../manage-expense-category/manage-expense-category.component';
import { MatDialog } from '@angular/material/dialog';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-expense-category-list',
  templateUrl: './expense-category-list.component.html',
  styleUrls: ['./expense-category-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    NgClass
  ]
})
export class ExpenseCategoryListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = ['action', 'name'];
  expenseCategories: ExpenseCategory[] = [];

  constructor(
    private expenseCategoryService: ExpenseCategoryService,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private commonDialogService: CommonDialogService,
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.getExpenseCategories();
  }

  getExpenseCategories(): void {
    this.expenseCategoryService.getAll().subscribe(c => {
      this.expenseCategories = c;
    });
  }

  deleteExpenseCategory(expenseCategory: ExpenseCategory): void {
    const areU = this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE');
    this.sub$.sink = this.commonDialogService.deleteConformationDialog(`${areU} :: ${expenseCategory.name}`)
      .subscribe((isTrue: any) => {
        if (isTrue) {
          this.sub$.sink = this.expenseCategoryService.delete(expenseCategory.id).subscribe(() => {
            this.toastrService.success(this.translationService.getValue('EXPENSE_CATEGORY_DELETED_SUCCESSFULLY'));
            this.expenseCategories = this.expenseCategories.filter(c => c.id !== expenseCategory.id);
          });
        }
      });
  }

  manageExpenseCategory(expenseCategory: ExpenseCategory | null): void {
    const dialogRef = this.dialog.open(ManageExpenseCategoryComponent, {
      width: '400px',
      direction: this.langDir,
      data: Object.assign({}, expenseCategory)
    });

    this.sub$.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.expenseCategories.findIndex(c => c.id === expenseCategory?.id);
        if (index > -1) {
          const updatedCategories = [...this.expenseCategories];
          updatedCategories[index] = result as ExpenseCategory;
          this.expenseCategories = updatedCategories;
        } else {
          this.expenseCategories = [...this.expenseCategories, result];
        }
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.expenseCategories.indexOf(row);
  }
}
