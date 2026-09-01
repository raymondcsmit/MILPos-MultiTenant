import { AccountTypePipe } from './account-type.pipe';
import { AccountType } from '../account-enum';

describe('AccountTypePipe', () => {
  const pipe = new AccountTypePipe();

  const expected: Array<[AccountType, string]> = [
    [AccountType.Asset, 'Asset'],
    [AccountType.Liability, 'Liability'],
    [AccountType.Equity, 'Equity'],
    [AccountType.Income, 'Income'],
    [AccountType.Expense, 'Expense']
  ];

  expected.forEach(([value, label]) => {
    it(`maps AccountType ${value} to "${label}"`, () => {
      expect(pipe.transform(value)).toBe(label);
    });
  });

  it('returns Unknown for unmapped value', () => {
    expect(pipe.transform(99)).toBe('Unknown');
  });

  it('returns Unknown for undefined', () => {
    expect(pipe.transform(undefined as unknown as number)).toBe('Unknown');
  });
});
