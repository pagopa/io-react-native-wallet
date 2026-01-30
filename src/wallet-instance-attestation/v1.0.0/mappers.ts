import { createMapper } from "../../utils/mappers";
import { DecodedAttestationJwt, type WalletAttestation } from "../api/types";
import {
  WalletAttestationResponse,
  WalletInstanceAttestationJwt,
} from "./types";

export const mapToDecodedAttestationJwt = createMapper<
  WalletInstanceAttestationJwt,
  DecodedAttestationJwt
>((x) => x.payload, {
  outputSchema: DecodedAttestationJwt,
});

export const mapToWalletAttestations = createMapper<
  WalletAttestationResponse,
  WalletAttestation[]
>((x) =>
  x.wallet_attestations.map((wa) => ({
    type: "wallet_app_attestation",
    format: wa.format,
    attestation: wa.wallet_attestation,
  }))
);
