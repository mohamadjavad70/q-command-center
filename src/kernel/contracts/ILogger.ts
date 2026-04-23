export interface ILogger {
  log(level: 'info' | 'warn' | 'error', message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}
