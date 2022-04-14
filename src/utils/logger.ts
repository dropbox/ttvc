import {DEBUG} from '..';

export class Logger {
  private static format(...messages: unknown[]) {
    return ['[ttvc]', ...messages, '::', performance.now()];
  }
  /** Log a debug message to the console */
  static debug(...messages: unknown[]) {
    if (!DEBUG) return;
    console.debug(...this.format(...messages));
  }
  /** Log a message to the console */
  static info(...messages: unknown[]) {
    if (!DEBUG) return;
    console.info(...this.format(...messages));
  }
  /** Log a warning message to the console */
  static warn(...messages: unknown[]) {
    if (!DEBUG) return;
    console.warn(...this.format(...messages));
  }
}
