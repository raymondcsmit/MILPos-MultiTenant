import { CustomKeyValuePipe } from './custom-key-value.pipe';
import { Tax } from '@core/domain-classes/tax';

describe('CustomKeyValuePipe', () => {
  const pipe = new CustomKeyValuePipe();

  it('returns empty array for null input', () => {
    expect(pipe.transform(null as any)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(pipe.transform(undefined as any)).toEqual([]);
  });

  it('returns empty array for empty object', () => {
    expect(pipe.transform({})).toEqual([]);
  });

  it('flattens all tax arrays into one array', () => {
    const t1: Tax = { id: 't1', name: 'GST', percentage: 10 };
    const t2: Tax = { id: 't2', name: 'VAT', percentage: 5 };
    const t3: Tax = { id: 't3', name: 'SGST', percentage: 2 };
    expect(pipe.transform({ a: [t1, t2], b: [t3] })).toEqual([t1, t2, t3]);
  });

  it('skips non-array values', () => {
    const t1: Tax = { id: 't1', name: 'GST', percentage: 10 };
    expect(pipe.transform({ a: [t1], b: null as any, c: 'junk' as any })).toEqual([t1]);
  });
});
