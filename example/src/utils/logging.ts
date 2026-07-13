import { Logging } from "@pagopa/io-react-native-wallet";
import {
  consoleTransport,
  logger,
  type transportFunctionType,
} from "react-native-logs";

const getRemoteServerTransport = (address: string) => {
  const customTransport: transportFunctionType<{}> = async (props) => {
    await fetch(address, {
      body: JSON.stringify({ msg: props.msg, ...props.level }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch((e) => {
      console.log(e);
    });
  };
  return customTransport;
};

/**
 * An implementation example of the logging system.
 * It creates a logger via `react-native-logs` and sends the logs to a custom server and to the console.
 * @param address - The address of the logging server.
 */
export const initLogging = (address?: string) => {
  /**
   * Initialize the logger with `react-native-logs`.
   */

  const transport = address
    ? [consoleTransport, getRemoteServerTransport(address)]
    : [consoleTransport];

  const reactNativeLogger = logger.createLogger({
    async: true,
    dateFormat: "time",
    enabled: true,
    fixedExtLvlLength: false,
    levels: {
      debug: 0,
      error: 3,
      info: 1,
      warn: 2,
    },
    printDate: true,
    printLevel: true,
    severity: "debug",
    transport,
    transportOptions: {
      colors: {
        error: "redBright",
        info: "blueBright",
        warn: "yellowBright",
      },
    },
  });

  /**
   * Create the logging context for the logger and sets it using the singleton class exposed by the library.
   */
  const loggingContext: Logging.LoggingContext = {
    logDebug(msg: string) {
      reactNativeLogger.debug(msg);
    },
    logError(msg: string) {
      reactNativeLogger.error(msg);
    },
    logInfo(msg: string) {
      reactNativeLogger.info(msg);
    },
    logWarn(msg: string) {
      reactNativeLogger.warn(msg);
    },
  };

  Logging.Logger.getInstance().initLogging(loggingContext);
};
