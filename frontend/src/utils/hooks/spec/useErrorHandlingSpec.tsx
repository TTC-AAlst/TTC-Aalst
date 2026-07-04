import { renderHook } from '@testing-library/react';
import { useErrorHandling } from '../useErrorHandling';
import { logger } from '../../logger';

describe('useErrorHandling', () => {
  it('logs window error events via logger.error', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    renderHook(() => useErrorHandling());

    window.dispatchEvent(new ErrorEvent('error', { message: 'kaboom', error: new Error('kaboom') }));

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.[0]).toContain('kaboom');
  });

  it('logs unhandled rejections via logger.error', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    renderHook(() => useErrorHandling());

    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
  });
});
