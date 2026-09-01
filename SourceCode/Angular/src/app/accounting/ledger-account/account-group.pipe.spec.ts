import { AccountGroupPipe } from './account-group.pipe';
import { AccountGroup } from '../account-enum';

describe('AccountGroupPipe', () => {
  const pipe = new AccountGroupPipe();

  const expected: Array<[AccountGroup, string]> = [
    [AccountGroup.CurrentAsset, 'Current Asset'],
    [AccountGroup.FixedAsset, 'Fixed Asset'],
    [AccountGroup.CurrentLiability, 'Current Liability'],
    [AccountGroup.LongTermLiability, 'Long Term Liability'],
    [AccountGroup.Capital, 'Capital'],
    [AccountGroup.Revenue, 'Revenue'],
    [AccountGroup.DirectExpense, 'Direct Expense'],
    [AccountGroup.IndirectExpense, 'Indirect Expense']
  ];

  expected.forEach(([value, label]) => {
    it(`maps AccountGroup ${value} to "${label}"`, () => {
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
