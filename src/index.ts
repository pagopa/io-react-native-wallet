import * as PID from "./pid";
import * as WalletInstanceAttestation from "./wallet-instance-attestation";

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export const WALLET_PROVIDER_BASE_URL =
  "https://io-d-wallet-it.azurewebsites.net";

export { PID, WalletInstanceAttestation };
