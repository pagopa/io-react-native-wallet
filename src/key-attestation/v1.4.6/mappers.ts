import { createMapper } from "../../utils/mappers";
import { DecodedKeyAttestation } from "../api/types";
import { KeyAttestationJwt } from "./types";

export const mapToDecodedKeyAttestation = createMapper<
  KeyAttestationJwt,
  DecodedKeyAttestation
>((x) => x.payload, {
  outputSchema: DecodedKeyAttestation,
});
