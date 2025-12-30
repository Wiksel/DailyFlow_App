 /*
 Centralized logging utility with environment-aware log levels and a simple
 exception capture hook (ready for integration with any crash reporting tool).

 Usage:
   Logger.debug('message', { any: 'context' })
   Logger.info('user logged in', user)
   Logger.warn('missing config')
   Logger.error('failed to fetch', error)
*/

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
let currentLevel: LogLevel = isDev ? 'debug' : 'warn';
let exceptionHandler: ((error: unknown, context?: Record<string, unknown>) => void) | null = null;

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function setExceptionHandler(handler: (error: unknown, context?: Record<string, unknown>) => void) {
  exceptionHandler = handler;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function serializeArgs(args: unknown[]): unknown[] {
  // Avoid accidentally logging huge objects or circular structures in production
  if (isDev) return args;
  return args.map((arg) => {
    try {
      if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: undefined };
      }
      if (typeof arg === 'object') {
        // Basic shallow clone to drop large nested structures
        return Array.isArray(arg) ? arg.slice(0, 10) : { ...(arg as Record<string, unknown>) };
      }
      return arg;
    } catch {
      return '[unserializable]';
    }
  });
}

export const Logger = {
  debug: (...args: unknown[]) => {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug('[DEBUG]', ...serializeArgs(args));
  },
  info: (...args: unknown[]) => {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info('[INFO]', ...serializeArgs(args));
  },
  warn: (...args: unknown[]) => {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...serializeArgs(args));
  },
  error: (...args: unknown[]) => {
    if (!shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...serializeArgs(args));
  },
  captureException: (error: unknown, context?: Record<string, unknown>) => {
    try {
      if (exceptionHandler) {
        exceptionHandler(error, context);
        return;
      }
    } catch {}
    // Fallback: log to console
    // eslint-disable-next-line no-console
    console.error('[EXCEPTION]', error, context ? serializeArgs([context]) : undefined);
  },
};

export default Logger;



