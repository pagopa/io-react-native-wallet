import type { WRPRCPayload } from "@pagopa/io-wallet-eudi-trust";

import { findUnregisteredRequests } from "../scope";

const wrprc = {
  credentials: [
    {
      claim: [
        { path: ["family_name"] },
        { path: ["place_of_birth", "country"] },
      ],
      format: "dc+sd-jwt",
      meta: { vct_values: ["urn:eudi:pid:1"] },
    },
    {
      claim: [{ path: ["eu.europa.ec.eudi.pid.1", "given_name"] }],
      format: "mso_mdoc",
      meta: { doctype_value: "eu.europa.ec.eudi.pid.1" },
    },
  ],
} as unknown as WRPRCPayload;

describe("findUnregisteredRequests", () => {
  it("finds nothing when the request is within the registered scope", () => {
    expect(
      findUnregisteredRequests(
        {
          credentials: [
            {
              claims: [
                { path: ["family_name"] },
                { path: ["place_of_birth", "country"] },
              ],
              format: "dc+sd-jwt",
              id: "pid-sd-jwt",
              meta: { vct_values: ["urn:eudi:pid:1"] },
            },
            {
              claims: [
                {
                  claim_name: "given_name",
                  namespace: "eu.europa.ec.eudi.pid.1",
                },
              ],
              format: "mso_mdoc",
              id: "pid-mdoc",
              meta: { doctype_value: "eu.europa.ec.eudi.pid.1" },
            },
          ],
        },
        wrprc,
      ),
    ).toEqual([]);
  });

  it("finds the unregistered credential types and claims", () => {
    expect(
      findUnregisteredRequests(
        {
          credentials: [
            {
              claims: [{ path: ["family_name"] }, { path: ["place_of_birth"] }],
              format: "dc+sd-jwt",
              id: "pid",
              meta: { vct_values: ["urn:eudi:pid:1", "urn:eudi:other:1"] },
            },
            {
              format: "mso_mdoc",
              id: "mdl",
              meta: { doctype_value: "org.iso.18013.5.1.mDL" },
            },
          ],
        },
        wrprc,
      ),
    ).toEqual([
      {
        credentialQueryId: "pid",
        format: "dc+sd-jwt",
        path: ["place_of_birth"],
        type: "urn:eudi:pid:1",
      },
      {
        credentialQueryId: "pid",
        format: "dc+sd-jwt",
        type: "urn:eudi:other:1",
      },
      {
        credentialQueryId: "mdl",
        format: "mso_mdoc",
        type: "org.iso.18013.5.1.mDL",
      },
    ]);
  });

  it("rejects a malformed DCQL query", () => {
    expect(() =>
      findUnregisteredRequests({ credentials: "pid" }, wrprc),
    ).toThrow();
  });
});
