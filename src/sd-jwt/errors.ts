/**
 * When claims are requested but not found in the credential
 *
 */
export class ClaimsNotFoundBetweenDisclosures extends Error {
  code = "ERR_CLAIMS_NOT_FOUND";

  /** The Claims not found */
  claims: string[];

  constructor(claims: string | string[]) {
    const c = Array.isArray(claims) ? claims : [claims];
    const message = `Some requested claims are not present in the disclosurable values, claims: ${c.join(
      ", "
    )}`;
    super(message);
    this.claims = c;
  }
}

/**
 * When the SD-JWT does not contain an hashed reference to a given set of claims
 */
export class ClaimsNotFoundInToken extends Error {
  code = "ERR_CLAIMS_NOT_FOUND_IN_TOKEN";

  /** The Claims not found */
  claims: string[];

  constructor(claims: string | string[]) {
    const claimsArray = Array.isArray(claims) ? claims : [claims];
    super(
      `Some requested claims are not present in the disclosurable values: ${claimsArray.join(
        ", "
      )}`
    );
    this.claims = claimsArray;
  }
}
