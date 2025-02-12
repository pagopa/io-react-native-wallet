import type { DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";

const credentials = ["ey..."];

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
});
