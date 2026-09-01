import { TransactionTypePipe } from './transaction-type.pipe';
import { TransactionType } from '../account-enum';

describe('TransactionTypePipe', () => {
  const pipe = new TransactionTypePipe();

  const expected: Array<[TransactionType, string]> = [
    [TransactionType.Purchase, 'Purchase'],
    [TransactionType.PurchaseReturn, 'Purchase Return'],
    [TransactionType.Sale, 'Sale'],
    [TransactionType.SaleReturn, 'Sale Return'],
    [TransactionType.Expense, 'Expense'],
    [TransactionType.StockAdjustment, 'Stock Adjustment'],
    [TransactionType.Payment, 'Payment'],
    [TransactionType.Receipt, 'Receipt'],
    [TransactionType.StockTransfer, 'Stock Transfer'],
    [TransactionType.YearEndClosing, 'Year End Closing'],
    [TransactionType.OpeningBalance, 'Opening Balance'],
    [TransactionType.PayRoll, 'PayRoll'],
    [TransactionType.LoanPayable, 'Loan Payable'],
    [TransactionType.LoanRepayment, 'Loan Repayment'],
    [TransactionType.DirectEntry, 'Direct Entry'],
    [TransactionType.StockTransferToBranch, 'Stock Transfer To Branch'],
    [TransactionType.StockTransferFromBranch, 'Stock Transfer From Branch']
  ];

  expected.forEach(([value, label]) => {
    it(`maps TransactionType ${value} to "${label}"`, () => {
      expect(pipe.transform(value)).toBe(label);
    });
  });

  it('returns Unknown for unmapped value', () => {
    expect(pipe.transform(999)).toBe('Unknown');
  });

  it('returns Unknown for undefined', () => {
    expect(pipe.transform(undefined as unknown as number)).toBe('Unknown');
  });
});
