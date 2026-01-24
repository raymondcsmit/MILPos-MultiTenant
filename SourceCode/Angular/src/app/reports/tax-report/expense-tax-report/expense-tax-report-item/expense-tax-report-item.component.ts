import { Component, input, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { Expense } from '@core/domain-classes/expense';
import { ExpenseTax } from '@core/domain-classes/expenseTax';
import { TaxItem } from '@core/domain-classes/purchase-sales-order-tax-item';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../../../base.component';
import { ExpenseService } from '../../../../expense/expense.service';
import { MatCardModule } from "@angular/material/card";
import { PageHelpTextComponent } from "@shared/page-help-text/page-help-text.component";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-expense-tax-report-item',
  imports: [
    MatTableModule,
    TranslateModule,
    CustomCurrencyPipe,
    MatCardModule,
    PageHelpTextComponent,
    NgClass
  ],
  templateUrl: './expense-tax-report-item.component.html',
  styleUrl: './expense-tax-report-item.component.scss'
})
export class ExpenseTaxReportItemComponent extends BaseComponent implements OnInit {
  expense = input.required<Expense>();
  expenseTaxItems: ExpenseTax[] = [];
  displayedColumns: string[] = ['name', 'taxValue'];

  constructor(private expenseService: ExpenseService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    this.expenseTaxItems = this.expense().expenseTaxes ?? [];
  }

  getExpenseTaxItems() {
    this.expenseService.getExpenseTaxItems(this.expense().id ?? '')
      .subscribe((data: TaxItem[]) => {
        this.expenseTaxItems = data;
      })
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.expenseTaxItems.indexOf(row);
  }
}
