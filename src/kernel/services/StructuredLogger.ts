import { ILogger } from '../contracts/ILogger';

export class StructuredLogger implements ILogger {
  log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    console.log(JSON.stringify(log));
  }
  info(message: string, meta?: any) { this.log('info', message, meta); }
  warn(message: string, meta?: any) { this.log('warn', message, meta); }
  error(message: string, meta?: any) { this.log('error', message, meta); }
}
