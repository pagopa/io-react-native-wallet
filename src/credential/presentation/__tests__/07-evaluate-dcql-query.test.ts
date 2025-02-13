import type { DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";

const credentials = ["eyJra..."];

describe("evaluateDcqlQuery", () => {
  it("should work correctly", () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "vc+sd-jwt",
          claims: [
            { id: "tax_id_code", path: ["tax_id_code"] },
            { id: "family_name", path: ["family_name"] },
            { id: "given_name", path: ["given_name"] },
          ],
        },
      ],
    };
    const result = evaluateDcqlQuery(credentials, query);

    console.log(JSON.stringify(result));
  });

  it.only("should work correctly with claim_sets", () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "vc+sd-jwt",
          claims: [
            { id: "tax_id_code", path: ["tax_id_code"] },
            { id: "family_name", path: ["family_name"] },
            { id: "given_name", path: ["given_name"] },
            { id: "not_found", path: ["not_found"] },
          ],
          claim_sets: [
            ["not_found", "family_name"],
            ["family_name", "given_name"],
          ],
        },
      ],
    };
    const result = evaluateDcqlQuery(credentials, query);

    console.log(JSON.stringify(result));
  });
});
