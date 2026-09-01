import { UTCToLocalTime } from './utc-to-local-time.pipe';

describe('UTCToLocalTime', () => {
  const pipe = new UTCToLocalTime();
  const date = new Date(2024, 0, 15, 10, 30, 0);
  const lang = navigator.language;

  it('returns empty string for null date', () => {
    expect(pipe.transform(null, 'short')).toBe('');
  });

  it('returns empty string for undefined date', () => {
    expect(pipe.transform(undefined, 'short')).toBe('');
  });

  it('formats short as date plus time', () => {
    const expected = `${date.toLocaleDateString(lang)} ${date.toLocaleTimeString(lang)}`;
    expect(pipe.transform(date, 'short')).toBe(expected);
  });

  it('formats shortDate as date only', () => {
    expect(pipe.transform(date, 'shortDate')).toBe(date.toLocaleDateString(lang));
  });

  it('formats shortTime as time only', () => {
    expect(pipe.transform(date, 'shortTime')).toBe(date.toLocaleTimeString(lang));
  });

  it('falls back to date plus time for unknown format', () => {
    const expected = `${date.toLocaleDateString(lang)} ${date.toLocaleTimeString(lang)}`;
    expect(pipe.transform(date, 'full')).toBe(expected);
    expect(pipe.transform(date, '')).toBe(expected);
  });
});
