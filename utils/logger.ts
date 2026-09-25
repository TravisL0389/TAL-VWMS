/**
 * Lightweight structured logger for browser-safe production diagnostics.
 * Debug logging is suppressed in production builds.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  return level !== 'debug' || import.meta.env.DEV;
}

function formatPayload(payload?: unknown): unknown[] {
  return payload === undefined ? [] : [payload];
}

function emit(level: LogLevel, message: string, payload?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }

  const args = [`[vwms:${level}] ${message}`, ...formatPayload(payload)];
  if (level === 'error') {
    console.error(...args);
    return;
  }
  if (level === 'warn') {
    console.warn(...args);
    return;
  }
  console.info(...args);
}

/**
 * Shared logger methods used across the client app.
 */
export const logger = {
  debug(message: string, payload?: unknown): void {
    emit('debug', message, payload);
  },
  info(message: string, payload?: unknown): void {
    emit('info', message, payload);
  },
  warn(message: string, payload?: unknown): void {
    emit('warn', message, payload);
  },
  error(message: string, payload?: unknown): void {
    emit('error', message, payload);
  },
};
