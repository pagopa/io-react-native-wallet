import { Logging } from "@pagopa/io-react-native-wallet";
import {
  consoleTransport,
  logger,
  type transportFunctionType,
} from "react-native-logs";

/**
 * An implementation example of the logging system.
 * It creates a logger via `react-native-logs` and sends the logs to a custom server and to the console.
 * @param address - The address of the logging server.
 */
export const initLogging = (address: string) => {
  /**
   * Initialize the logger with `react-native-logs`.
   */
  const customTransport: transportFunctionType<{}> = async (props) => {
    console.log(address);
    await fetch(address, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msg: props.msg, ...props.level }),
    }).catch((e) => {
      console.log(e);
    });
  };

  const reactNativeLogger = logger.createLogger({
    levels: {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    },
    severity: "debug",
    transport: [consoleTransport, customTransport],
    transportOptions: {
      colors: {
        info: "blueBright",
        warn: "yellowBright",
        error: "redBright",
      },
    },
    async: true,
    dateFormat: "time",
    printLevel: true,
    printDate: true,
    fixedExtLvlLength: false,
    enabled: true,
  });

  /**
   * Create the logging context for the logger and sets it using the singleton class exposed by the library.
   */
  const loggingContext: Logging.LoggingContext = {
    logDebug(msg: string) {
      reactNativeLogger.debug(msg);
    },
    logInfo(msg: string) {
      reactNativeLogger.info(msg);
    },
    logWarn(msg: string) {
      reactNativeLogger.warn(msg);
    },
    logError(msg: string) {
      reactNativeLogger.error(msg);
    },
  };

  Logging.Logger.getInstance().initLogging(loggingContext);
};
