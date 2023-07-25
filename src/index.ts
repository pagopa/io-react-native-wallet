import * as PID from "./pid";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";
import * as Errors from "./utils/errors";

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export { PID, WalletInstanceAttestation, Errors };
