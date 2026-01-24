import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Transaction } from '../transaction';
import { TransactionItem } from '../transaction-item';
import { TransactionService } from '../transaction.service';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../../base.component';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatCardModule } from "@angular/material/card";
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-transaction-item-list',
  imports: [
    MatTableModule,
    TranslateModule,
    CustomCurrencyPipe,
    PageHelpTextComponent,
    MatCardModule,
    NgClass
  ],
  templateUrl: './transaction-item-list.component.html',
  styleUrl: './transaction-item-list.component.scss',
})
export class TransactionItemListComponent
  extends BaseComponent
  implements OnInit, OnChanges {
  @Input() transaction!: Transaction;
  transactionItems: TransactionItem[] = [];
  displayedColumns: string[] = [
    'productName',
    'quantity',
    'unitPrice',
    'discountAmount',
    'taxPercentage',
    'taxAmount',
    'lineTotal',
  ];

  constructor(private transactionService: TransactionService) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction']) {
      this.getTransactionItems();
    }
  }

  getTransactionItems() {
    this.transactionService
      .getTransactionItems(this.transaction.id ?? '')
      .subscribe((data: TransactionItem[]) => {
        this.transactionItems = data;
      });
  }

    isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.transactionItems.indexOf(row);
  }
}
