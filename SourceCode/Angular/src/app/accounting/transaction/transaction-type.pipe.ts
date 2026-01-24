import { Pipe, PipeTransform } from '@angular/core';
import { TransactionType } from '../account-enum';

@Pipe({
  name: 'transactionType'
})
export class TransactionTypePipe implements PipeTransform {

  transform(value: number): string {
    switch (value) {
      case TransactionType.Purchase:
        return 'Purchase';
      case TransactionType.PurchaseReturn:
        return 'Purchase Return';
      case TransactionType.Sale:
        return 'Sale';
      case TransactionType.SaleReturn:
        return 'Sale Return';
      case TransactionType.Expense:
        return 'Expense';
      case TransactionType.StockAdjustment:
        return 'Stock Adjustment';
      case TransactionType.Payment:
        return 'Payment';
      case TransactionType.Receipt:
        return 'Receipt';
      case TransactionType.StockTransfer:
        return 'Stock Transfer';
      case TransactionType.YearEndClosing:
        return 'Year End Closing';
      case TransactionType.OpeningBalance:
        return 'Opening Balance';
      case TransactionType.PayRoll:
        return 'PayRoll';
      case TransactionType.LoanPayable:
        return 'Loan Payable'
      case TransactionType.LoanRepayment:
        return 'Loan Repayment'
      case TransactionType.DirectEntry:
        return 'Direct Entry';
      case TransactionType.StockTransferToBranch:
        return 'Stock Transfer To Branch';
      case TransactionType.StockTransferFromBranch:
        return 'Stock Transfer From Branch';
      default:
        return 'Unknown';
    }
  }
}
