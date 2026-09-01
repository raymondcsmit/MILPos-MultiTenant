import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('returns empty string for null input', () => {
    expect(pipe.transform(null as any, '5')).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(pipe.transform(undefined as any, '5')).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(pipe.transform('', '5')).toBe('');
  });

  it('returns value unchanged when within default limit of 100', () => {
    expect(pipe.transform('a'.repeat(100), undefined as any)).toBe('a'.repeat(100));
  });

  it('truncates at default limit of 100 with trail', () => {
    expect(pipe.transform('a'.repeat(101), undefined as any)).toBe('a'.repeat(100) + '...');
  });

  it('truncates at the numeric string limit', () => {
    expect(pipe.transform('hello world', '5')).toBe('hello...');
  });

  it('returns value unchanged when shorter than the limit', () => {
    expect(pipe.transform('hello', '10')).toBe('hello');
  });
});
