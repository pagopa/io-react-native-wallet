import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import { Platform } from "react-native";
import {
  checkMultiple,
  type Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from "react-native-permissions";

export const WELL_KNOWN_CREDENTIALS = {
  mdl: "org.iso.18013.5.1.mDL",
  wia: "org.iso.18013.5.1.IT.WalletAttestation",
} as const;

const PERMISSIONS_TO_CHECK: Array<Permission> =
  Platform.OS === "android"
    ? Platform.Version >= 31
      ? [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
        ] // Android 12 and above: Request new Bluetooth permissions along with location.
      : [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] // Android 9 to Android 11: Only location permission is required for BLE.
    : [PERMISSIONS.IOS.BLUETOOTH]; // iOS permissions required are Bluetooth and location.

/**
 * Utility function to request Bluetooth permissions for both iOS and Android via react-native-permissions.
 */
export const requestBlePermissions = async (): Promise<boolean> => {
  try {
    // Check current permission status
    const statuses = await checkMultiple(PERMISSIONS_TO_CHECK);

    // Filter out already granted permissions
    const permissionsToRequest = PERMISSIONS_TO_CHECK.filter(
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

/**
 * This function generates the accepted fields for the VerifierRequest and sets each requested field to true.
 * It copies the content of the request object, removes the `isAuthenticated` field and sets all other fields to true
 * simulating the full acceptance of the request.
 * @param request - The request object containing the requested fields
 * @returns A new object representing the accepted fields, with each requested field set to true
 */
export const generateAcceptedFields = (
  request: ISO18013_5.VerifierRequest["request"]
): ISO18013_5.AcceptedFields => {
  // Cycle through the requested credentials
  const result: ISO18013_5.AcceptedFields = {};
  for (const credentialKey in request) {
    const credential = request[credentialKey];
    if (!credential) {
      continue;
    }

    // Cycle through the requested namespaces and the isAuthenticated field
    const namespaces: ISO18013_5.AcceptedFields["credential"] = {};
    for (const namespaceKey in credential) {
      // Skip the isAuthenticated field
      if (!credential[namespaceKey] || namespaceKey === "isAuthenticated") {
        continue;
      }

      // Cycle through the requested fields and set them to true
      const fields: ISO18013_5.AcceptedFields["credential"]["namespace"] = {};
      for (const fieldKey in credential[namespaceKey]!) {
        fields[fieldKey] = true;
      }
      namespaces[namespaceKey] = fields;
    }
    result[credentialKey] = namespaces;
  }

  return result;
};
