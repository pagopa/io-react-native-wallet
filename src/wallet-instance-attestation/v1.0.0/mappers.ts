import { createMapper } from "../../utils/mappers";
import {
  DecodedWalletInstanceAttestation,
  type WalletAttestation,
} from "../api/types";
import {
  WalletAttestationResponse,
  WalletInstanceAttestationJwt,
} from "./types";

export const mapToDecodedWalletInstanceAttestation = createMapper<
  WalletInstanceAttestationJwt,
  DecodedWalletInstanceAttestation
>((x) => x.payload, {
  outputSchema: DecodedWalletInstanceAttestation,
});

export const mapToWalletAttestations = createMapper<
  WalletAttestationResponse,
  WalletAttestation[]
>((x) =>
  x.wallet_attestations.map((wa) => ({
    format: wa.format,
    attestation: wa.wallet_attestation,
  }))
);
