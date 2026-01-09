/**
 * Simple logging utility
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private level: LogLevel;
  private quiet: boolean;

  constructor(level: LogLevel = LogLevel.INFO, quiet: boolean = false) {
    this.level = level;
    this.quiet = quiet;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  error(message: string, ...args: any[]): void {
    if (!this.quiet && this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (!this.quiet && this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (!this.quiet && this.level >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (!this.quiet && this.level >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (!this.quiet) {
      console.log(`✓ ${message}`, ...args);
    }
  }
}

// Default logger instance
export const logger = new Logger();
