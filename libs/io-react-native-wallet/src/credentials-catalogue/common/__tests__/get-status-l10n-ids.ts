import type { DigitalCredential } from "../../api/DigitalCredentialsCatalogue";

import { getStatusL10nIds } from "../get-status-l10n-ids";

const makeCredential = (
  allowedStates: DigitalCredential["validity_info"]["allowed_states"],
): DigitalCredential =>
  ({
    validity_info: { allowed_states: allowedStates },
  }) as DigitalCredential;

const validState = {
  "0x00": "VALID",
  description_l10n_id: "mDL.VALID.description",
  title_l10n_id: "mDL.VALID.title",
};

const invalidState = {
  "0x01": "INVALID",
  description_l10n_id: "mDL.INVALID.description",
  title_l10n_id: "mDL.INVALID.title",
};

const suspendedState = {
  "0x02": "SUSPENDED",
  description_l10n_id: "mDL.SUSPENDED.description",
  title_l10n_id: "mDL.SUSPENDED.title",
};

const attrUpdateState = {
  "0x0b": "ATTRIBUTE_UPDATE",
  description_l10n_id: "mDL.ATTRIBUTE_UPDATE.description",
  title_l10n_id: "mDL.ATTRIBUTE_UPDATE.title",
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
      descriptionL10nId: "mDL.VALID.description",
      titleL10nId: "mDL.VALID.title",
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
      descriptionL10nId: "mDL.ATTRIBUTE_UPDATE.description",
      titleL10nId: "mDL.ATTRIBUTE_UPDATE.title",
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
      descriptionL10nId: "mDL.VALID.description",
      titleL10nId: "mDL.VALID.title",
    });
  });

  it("returns undefined when allowed_states contains only strings", () => {
    const credential = makeCredential(["VALID", "INVALID"]);
    expect(getStatusL10nIds("0x00", credential)).toBeUndefined();
  });
});
