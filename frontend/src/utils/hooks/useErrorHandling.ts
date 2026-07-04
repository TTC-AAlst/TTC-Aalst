import { useEffect } from 'react';
import { logger } from '../logger';

export const useErrorHandling = () => {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error(`window.onerror: ${event.message}`, {
        stack: event.error?.stack,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.error(`unhandledrejection: ${event.reason?.message || 'Unhandled rejection'}`, {
        stack: event.reason?.stack,
      });
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);
};
