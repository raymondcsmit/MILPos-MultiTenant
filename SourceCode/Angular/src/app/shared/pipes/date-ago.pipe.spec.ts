import { DateAgoPipe } from './date-ago.pipe';

describe('DateAgoPipe', () => {
  const pipe = new DateAgoPipe();
  const secondsAgo = (s: number) => new Date(Date.now() - s * 1000);

  it('returns empty string for null input', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns Just now for less than 30 seconds', () => {
    expect(pipe.transform(secondsAgo(29))).toBe('Just now');
  });

  it('returns singular minute', () => {
    expect(pipe.transform(secondsAgo(65))).toBe('1 minute ago');
  });

  it('returns plural minutes', () => {
    expect(pipe.transform(secondsAgo(120))).toBe('2 minutes ago');
  });

  it('returns seconds for 30-59 seconds', () => {
    expect(pipe.transform(secondsAgo(45))).toBe('45 seconds ago');
  });

  it('returns singular hour', () => {
    expect(pipe.transform(secondsAgo(3600))).toBe('1 hour ago');
  });

  it('returns plural hours', () => {
    expect(pipe.transform(secondsAgo(7200))).toBe('2 hours ago');
  });

  it('returns singular day', () => {
    expect(pipe.transform(secondsAgo(86400))).toBe('1 day ago');
  });

  it('returns plural days', () => {
    expect(pipe.transform(secondsAgo(172800))).toBe('2 days ago');
  });

  it('returns singular week', () => {
    expect(pipe.transform(secondsAgo(604800))).toBe('1 week ago');
  });

  it('returns plural weeks', () => {
    expect(pipe.transform(secondsAgo(1209600))).toBe('2 weeks ago');
  });

  it('returns singular month', () => {
    expect(pipe.transform(secondsAgo(2592000))).toBe('1 month ago');
  });

  it('returns plural months', () => {
    expect(pipe.transform(secondsAgo(5184000))).toBe('2 months ago');
  });

  it('returns singular year', () => {
    expect(pipe.transform(secondsAgo(31536000))).toBe('1 year ago');
  });

  it('returns plural years', () => {
    expect(pipe.transform(secondsAgo(63072000))).toBe('2 years ago');
  });
});
