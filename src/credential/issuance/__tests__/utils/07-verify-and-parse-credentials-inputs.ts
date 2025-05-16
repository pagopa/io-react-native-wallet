import {
  type TestScenario,
  type ParseCredentialArg,
  type ParseCredentialReturn,
  buildMockSDJWTTestScenario,
  buildMockMDOCTestScenario,
} from "./07-verify-and-parse-credentials-utils";
import { IoWalletError } from "../../../../utils/errors";

export const inputs: TestScenario<
  ParseCredentialArg,
  ParseCredentialReturn,
  Error
>[] = [
  // sd-jwt
  {
    name: "Mandatory claims = Disclosures, all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [
          ["unused", "family_name", "Rossi"],
          ["unused", "given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: true,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims = Disclosures, not all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["unused", "family_name", "Rossi"],
          ["unused", "given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: false,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims < Disclosures, all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [
          ["unused", "family_name", "Rossi"],
          ["unused", "given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: "given_name",
        value: "Mario",
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims < Disclosures, not all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["unused", "family_name", "Rossi"],
          ["unused", "given_name", "Mario"],
          ["unused", "birth_date", new Date(2000, 2, 1)],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: false,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
      birth_date: {
        name: "birth_date",
        value: new Date(2000, 2, 1),
      },
    },
  },
  {
    name: "Mandatory claims > Disclosures, all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [["unused", "family_name", "Rossi"]]
      ),
    },
    throws: new IoWalletError(),
  },
  {
    name: "Mandatory claims > Disclosures, not all mandatory",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          birth_date: {
            display: [
              {
                name: "Data di nascita",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [["unused", "family_name", "Rossi"]]
      ),
    },
    throws: new IoWalletError(),
  },
  {
    name: "Non mandatory claim not found",
    input: {
      format: "vc+sd-jwt",
      parameters: buildMockSDJWTTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["unused", "family_name", "Rossi"],
          ["unused", "birth_date", new Date(2000, 2, 1)],
        ]
      ),
    },
    expected: {
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
      birth_date: {
        name: "birth_date",
        value: new Date(2000, 2, 1),
      },
    },
  },
  //MDOC
  {
    name: "Mandatory claims = Disclosures, all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [
          ["family_name", "Rossi"],
          ["given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: true,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims = Disclosures, not all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["family_name", "Rossi"],
          ["given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: false,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims < Disclosures, all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [
          ["family_name", "Rossi"],
          ["given_name", "Mario"],
        ]
      ),
    },
    expected: {
      given_name: {
        name: "given_name",
        value: "Mario",
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
    },
  },
  {
    name: "Mandatory claims < Disclosures, not all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["family_name", "Rossi"],
          ["given_name", "Mario"],
          ["birth_date", new Date(2000, 2, 1)],
        ]
      ),
    },
    expected: {
      given_name: {
        name: {
          "it-IT": "Nome",
        },
        value: "Mario",
        mandatory: false,
      },
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
      birth_date: {
        name: "birth_date",
        value: new Date(2000, 2, 1),
      },
    },
  },
  {
    name: "Mandatory claims > Disclosures, all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
        },
        [["family_name", "Rossi"]]
      ),
    },
    throws: new IoWalletError(),
  },
  {
    name: "Mandatory claims > Disclosures, not all mandatory",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          birth_date: {
            display: [
              {
                name: "Data di nascita",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [["family_name", "Rossi"]]
      ),
    },
    throws: new IoWalletError(),
  },
  {
    name: "Not mandatory claim not found",
    input: {
      format: "mso_mdoc",
      parameters: buildMockMDOCTestScenario(
        {
          family_name: {
            display: [
              {
                name: "Cognome",
                locale: "it-IT",
              },
            ],
            mandatory: true,
          },
          given_name: {
            display: [
              {
                name: "Nome",
                locale: "it-IT",
              },
            ],
            mandatory: false,
          },
        },
        [
          ["family_name", "Rossi"],
          ["birth_date", new Date(2000, 2, 1)],
        ]
      ),
    },
    expected: {
      family_name: {
        name: {
          "it-IT": "Cognome",
        },
        value: "Rossi",
        mandatory: true,
      },
      birth_date: {
        name: "birth_date",
        value: new Date(2000, 2, 1),
      },
    },
  },
];
