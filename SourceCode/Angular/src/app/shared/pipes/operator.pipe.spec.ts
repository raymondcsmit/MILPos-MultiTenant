import { UnitOperatorPipe } from './operator.pipe';
import { unitOperators } from '@core/domain-classes/operator';
import { TranslationService } from '@core/services/translation.service';

describe('UnitOperatorPipe', () => {
  const translationService = { getValue: (key: string) => `T:${key}` } as unknown as TranslationService;
  const pipe = new UnitOperatorPipe(translationService);

  unitOperators.forEach((operator) => {
    it(`maps operator ${operator.id} to translated "${operator.name}"`, () => {
      expect(pipe.transform(operator.id)).toBe(`T:${operator.name}`);
    });
  });

  it('accepts string ids via loose equality', () => {
    expect(pipe.transform('2')).toBe('T:Multiply');
  });

  it('returns empty string for unknown id', () => {
    expect(pipe.transform(999)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
