import { getStatusL10nIds } from "../DigitalCredentialsCatalogue";

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

const allowedStates = [
  validState,
  invalidState,
  suspendedState,
  attrUpdateState,
];

describe("getStatusL10nIds", () => {
  it("returns l10n ids for a matching lowercase statusBit", () => {
    expect(getStatusL10nIds("0x00", allowedStates)).toEqual({
      titleL10nId: "mDL.VALID.title",
      descriptionL10nId: "mDL.VALID.description",
    });
  });

  it("returns l10n ids for a matching uppercase statusBit (case-insensitive)", () => {
    expect(getStatusL10nIds("0x0B", allowedStates)).toEqual({
      titleL10nId: "mDL.ATTRIBUTE_UPDATE.title",
      descriptionL10nId: "mDL.ATTRIBUTE_UPDATE.description",
    });
  });

  it("returns undefined when statusBit is not in the list", () => {
    expect(getStatusL10nIds("0x03", allowedStates)).toBeUndefined();
  });

  it("returns undefined for an empty allowedStates array", () => {
    expect(getStatusL10nIds("0x00", [])).toBeUndefined();
  });

  it("skips string entries (v1.0.0 format) without crashing", () => {
    const mixedStates = ["VALID", "INVALID", validState];
    expect(getStatusL10nIds("0x00", mixedStates)).toEqual({
      titleL10nId: "mDL.VALID.title",
      descriptionL10nId: "mDL.VALID.description",
    });
  });

  it("returns undefined when allowedStates contains only strings", () => {
    expect(getStatusL10nIds("0x00", ["VALID", "INVALID"])).toBeUndefined();
  });
});
