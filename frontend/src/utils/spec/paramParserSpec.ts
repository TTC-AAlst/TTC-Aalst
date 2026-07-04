import { parseEvents } from '../paramParser';
import { logger } from '../logger';

describe('parseEvents', () => {
  it('returns [] and logs an error on invalid JSON', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const result = parseEvents('{not json');
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.[0]).toContain('parseEvents');
  });

  it('parses valid JSON', () => {
    expect(parseEvents('["a","b"]')).toEqual(['a', 'b']);
  });
});
