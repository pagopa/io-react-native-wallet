import { Logging } from "@pagopa/io-react-native-wallet";
import {
  consoleTransport,
  logger,
  type transportFunctionType,
} from "react-native-logs";

const REMOTE_IP = "http://localhost:3045/sendLogs";

const customTransport: transportFunctionType<{}> = async (props) => {
  await fetch(REMOTE_IP, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ msg: props.msg, ...props.level }),
  }).catch((_) => {});
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
