import type { ObtainCredential } from "./05-obtain-credential";
import type { Out } from "./utils";

export type ConfirmCredential = (
  credential: Out<ObtainCredential>["credential"]
) => Promise<void>;
