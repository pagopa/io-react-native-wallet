import { getStatusL10nIds } from "../get-status-l10n-ids";
import type { DigitalCredential } from "../../api/DigitalCredentialsCatalogue";

const makeCredential = (
  allowedStates: DigitalCredential["validity_info"]["allowed_states"],
): DigitalCredential =>
  ({
    validity_info: { allowed_states: allowedStates },
  }) as DigitalCredential;

const validState = {
  "0x00": "VALID",
  title_l10n_id: "mDL.VALID.title",
  description_l10n_id: "mDL.VALID.description",
};

const invalidState = {
  "0x01": "INVALID",
  title_l10n_id: "mDL.INVALID.title",
  description_l10n_id: "mDL.INVALID.description",
};

const suspendedState = {
  "0x02": "SUSPENDED",
  title_l10n_id: "mDL.SUSPENDED.title",
  description_l10n_id: "mDL.SUSPENDED.description",
};

const attrUpdateState = {
  "0x0b": "ATTRIBUTE_UPDATE",
  title_l10n_id: "mDL.ATTRIBUTE_UPDATE.title",
  description_l10n_id: "mDL.ATTRIBUTE_UPDATE.description",
};

describe("getStatusL10nIds", () => {
  it("returns l10n ids for a matching lowercase statusBit", () => {
    const credential = makeCredential([
      validState,
      invalidState,
      suspendedState,
      attrUpdateState,
    ]);
    expect(getStatusL10nIds("0x00", credential)).toEqual({
      titleL10nId: "mDL.VALID.title",
      descriptionL10nId: "mDL.VALID.description",
    });
  });

  it("returns l10n ids for a matching uppercase statusBit (case-insensitive)", () => {
    const credential = makeCredential([
      validState,
      invalidState,
      suspendedState,
      attrUpdateState,
    ]);
    expect(getStatusL10nIds("0x0B", credential)).toEqual({
      titleL10nId: "mDL.ATTRIBUTE_UPDATE.title",
      descriptionL10nId: "mDL.ATTRIBUTE_UPDATE.description",
    });
  });

  it("returns undefined when statusBit is not in the list", () => {
    const credential = makeCredential([validState, invalidState]);
    expect(getStatusL10nIds("0x03", credential)).toBeUndefined();
  });

  it("returns undefined for an empty allowed_states array", () => {
    const credential = makeCredential([]);
    expect(getStatusL10nIds("0x00", credential)).toBeUndefined();
  });

  it("skips string entries (v1.0.0 format) without crashing", () => {
    const credential = makeCredential(["VALID", "INVALID", validState]);
    expect(getStatusL10nIds("0x00", credential)).toEqual({
      titleL10nId: "mDL.VALID.title",
      descriptionL10nId: "mDL.VALID.description",
    });
  });

  it("returns undefined when allowed_states contains only strings", () => {
    const credential = makeCredential(["VALID", "INVALID"]);
    expect(getStatusL10nIds("0x00", credential)).toBeUndefined();
  });
});
