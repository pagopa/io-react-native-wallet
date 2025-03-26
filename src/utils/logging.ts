/**
 * Logger interface which can be provided to the Logger class as a custom implementation.
 */
export interface LoggingContext {
  logDebug: (msg: string) => void;
  logInfo: (msg: string) => void;
  logWarn: (msg: string) => void;
  logError: (msg: string) => void;
}

/**
 * Supported debug levels.
 */
export enum DebugLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

/**
 * Logger singleton class which provides a simple logging interface with an init function to set the logging context and
 * a static log function to log messages based on the debug level.
 * This can be used as follows:
 * const logger = Logger.getInstance();
 * logger.initLogging(yourLoggingContext);
 * logger.log(DebugLevel.DEBUG, "Debug message");
 */
export class Logger {
  private static instance: Logger | null = null;
  private static loggingContext?: LoggingContext;

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Public static method to get the Logger instance
  public static getInstance(): Logger {
    if (Logger.instance === null) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Method to initialize the logging context
  public initLogging(loggingCtx: LoggingContext): void {
    Logger.loggingContext = loggingCtx;
  }

  // Method to log based on the level which wraps the null check for the logging context
  public static log(level: DebugLevel, msg: string): void {
    if (Logger.loggingContext) {
      switch (level) {
        case DebugLevel.DEBUG:
          Logger.loggingContext.logDebug(msg);
          break;
        case DebugLevel.INFO:
          Logger.loggingContext.logInfo(msg);
          break;
        case DebugLevel.WARN:
          Logger.loggingContext.logWarn(msg);
          break;
        case DebugLevel.ERROR:
          Logger.loggingContext.logError(msg);
          break;
      }
    }
  }
}
