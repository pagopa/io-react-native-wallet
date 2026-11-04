import type { KeyAttestationApi } from "../api";

import { withMapper } from "../../utils/mappers";
import { getAttestation, getChallenge } from "./issuing";
import { mapToDecodedKeyAttestation } from "./mappers";
import { decode } from "./utils";

export const KeyAttestation: KeyAttestationApi = {
  decode: withMapper(mapToDecodedKeyAttestation, decode),
  getAttestation,
  getChallenge,
  isSupported: true,
};
