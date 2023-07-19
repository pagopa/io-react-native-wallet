import * as PID from "./pid";
import * as WalletInstanceAttestationJwt from "./wallet-instance-attestation";

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export { PID, WalletInstanceAttestationJwt };
