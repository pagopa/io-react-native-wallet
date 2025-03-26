export interface LoggingContext {
  logDebug: (msg: string) => void;
  logInfo: (msg: string) => void;
  logWarn: (msg: string) => void;
  logError: (msg: string) => void;
}

export enum DebugLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

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

  // Method to log based on the level
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
