import type {
  AcceptedFields,
  VerifierRequest,
} from "@pagopa/io-react-native-proximity";
import { Platform } from "react-native";
import {
  checkMultiple,
  type Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from "react-native-permissions";

/**
 * Repeatedly checks a condition function until it returns true,
 * then resolves the returned promise. If the condition function does not return true
 * within the specified timeout, the promise is rejected.
 *
 * @param conditionFunction - A function that returns a boolean value.
 *                            The promise resolves when this function returns true.
 * @param timeout - An optional timeout in seconds. The promise is rejected if the
 *                  condition function does not return true within this time.
 * @returns A promise that resolves once the conditionFunction returns true or rejects if timed out.
 */
export const until = (
  conditionFunction: () => boolean,
  timeoutSeconds?: number
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (conditionFunction()) {
        resolve();
      } else if (
        timeoutSeconds !== undefined &&
        Date.now() - start >= timeoutSeconds * 1000
      ) {
        reject(new Error("Timeout exceeded"));
      } else {
        setTimeout(poll, 400);
      }
    };

    poll();
  });

/**
 * Creates a promise that waits until the provided signal is aborted.
 * @returns {Object} An object with `listen` and `remove` methods to handle subscribing and unsubscribing.
 */
export const createAbortPromiseFromSignal = (signal: AbortSignal) => {
  let listener: () => void;
  return {
    listen: () =>
      new Promise<"OPERATION_ABORTED">((resolve) => {
        if (signal.aborted) {
          return resolve("OPERATION_ABORTED");
        }
        listener = () => resolve("OPERATION_ABORTED");
        signal.addEventListener("abort", listener);
      }),
    remove: () => signal.removeEventListener("abort", listener),
  };
};

export const isDefined = <T>(x: T | undefined | null | ""): x is T =>
  Boolean(x);

/**
 * This function generates the accepted fields for the VerifierRequest and sets each requested field to true.
 * It copies the content of the request object, removes the `isAuthenticated` field and sets all other fields to true
 * simulating the full acceptance of the request.
 * @param request - The request object containing the requested fields
 * @returns A new object representing the accepted fields, with each requested field set to true
 */
export const generateAcceptedFields = (
  request: VerifierRequest["request"]
): AcceptedFields => {
  // Cycle through the requested credentials
  const result: AcceptedFields = {};
  for (const credentialKey in request) {
    const credential = request[credentialKey];
    if (!credential) {
      continue;
    }

    // Cycle through the requested namespaces and the isAuthenticated field
    const namespaces: AcceptedFields["credential"] = {};
    for (const namespaceKey in credential) {
      // Skip the isAuthenticated field
      if (!credential[namespaceKey] || namespaceKey === "isAuthenticated") {
        continue;
      }

      // Cycle through the requested fields and set them to true
      const fields: AcceptedFields["credential"]["namespace"] = {};
      for (const fieldKey in credential[namespaceKey]!) {
        fields[fieldKey] = true;
      }
      namespaces[namespaceKey] = fields;
    }
    result[credentialKey] = namespaces;
  }

  return result;
};

/**
 * Utility function to request Bluetooth permissions for both iOS and Android via react-native-permissions.
 */
export const requestBlePermissions = async (): Promise<boolean> => {
  let permissionsToCheck: Permission[];

  if (Platform.OS === "android") {
    if (Platform.Version >= 31) {
      // Android 12 and above: Request new Bluetooth permissions along with location.
      permissionsToCheck = [
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
      ];
    } else {
      // Android 9 to Android 11: Only location permission is required for BLE.
      permissionsToCheck = [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];
    }
  } else {
    // iOS permissions required are Bluetooth and location.
    permissionsToCheck = [PERMISSIONS.IOS.BLUETOOTH];
  }

  try {
    // Check current permission status
    const statuses = await checkMultiple(permissionsToCheck);

    // Filter out already granted permissions
    const permissionsToRequest = permissionsToCheck.filter(
      (permission) => statuses[permission] !== RESULTS.GRANTED
    );

    if (permissionsToRequest.length > 0) {
      // Request only the missing permissions
      const requestResults = await requestMultiple(permissionsToRequest);

      // Verify if all requested permissions are granted
      return permissionsToRequest.every(
        (permission) => requestResults[permission] === RESULTS.GRANTED
      );
    }

    return true; // All permissions were already granted
  } catch (error) {
    console.error("Permission request error:", error);
    return false;
  }
};
