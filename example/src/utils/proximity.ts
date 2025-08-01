import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import { Platform } from "react-native";
import {
  checkMultiple,
  type Permission,
  PERMISSIONS,
  requestMultiple,
  RESULTS,
} from "react-native-permissions";

/**
 * Alias type for AcceptedFields
 */
export type AcceptedFields = ISO18013_5.AcceptedFields;

/**
 * Alias type for EventsPayload
 */
export type EventsPayload = ISO18013_5.EventsPayload;

/**
 * Alias type for RequestedDocument
 */
export type RequestedDocument = ISO18013_5.RequestedDocument;

/**
 * Alias type for VerifierRequest
 */
export type VerifierRequest = ISO18013_5.VerifierRequest;

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

interface NestedBooleanMap {
  [key: string]: boolean | NestedBooleanMap;
}

const acceptAllFields = <T extends NestedBooleanMap>(input: T): T =>
  Object.entries(input).reduce((acc, [key, value]) => {
    if (typeof value === "boolean") {
      return { ...acc, [key]: true };
    } else if (typeof value === "object" && value !== null) {
      return { ...acc, [key]: acceptAllFields(value) };
    } else {
      return { ...acc, [key]: value };
    }
  }, {} as T);

/**
 * This function generates the accepted fields for the VerifierRequest and sets each requested field to true.
 * It removes the `isAuthenticated` field and sets all other fields to true simulating the full acceptance of the request.
 *
 * @param request - The request object containing the requested fields
 * @returns A new object representing the accepted fields, with each requested field set to true
 */
export const generateAcceptedFields = (
  request: VerifierRequest["request"]
): AcceptedFields =>
  Object.entries(request).reduce(
    (acc, [docType, { isAuthenticated: _, ...namespaces }]) => ({
      ...acc,
      [docType]: acceptAllFields(namespaces),
    }),
    {}
  );
