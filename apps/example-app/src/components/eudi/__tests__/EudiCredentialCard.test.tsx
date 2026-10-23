import { render } from "@testing-library/react-native";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { EudiCredentialCard } from "../EudiCredentialCard";

jest.mock("@pagopa/io-app-design-system", () => ({
  IOColors: {},
  IOText: jest.requireActual("react-native").Text,
}));

jest.mock("../../../utils/eudi", () => ({
  getCredentialColors: () => ({
    backgroundColor: "#E8A0B4",
    textColor: "#3B1B28",
  }),
  getFormatLabel: () => "mdoc",
  withOpacity: () => "rgba(59, 27, 40, 0.18)",
}));

describe("EudiCredentialCard", () => {
  it("draws decoration on the card surface without texture image layers", () => {
    const { UNSAFE_getAllByType, UNSAFE_queryAllByType } = render(
      <EudiCredentialCard
        credential={{
          credentialConfigurationId: "mdl",
          format: "mso_mdoc",
          issuer: "Issuer",
        }}
      />,
    );

    const [card] = UNSAFE_getAllByType(View);
    expect(card).toBeDefined();
    expect(StyleSheet.flatten(card?.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: "#E8A0B4",
        experimental_backgroundImage:
          expect.stringContaining("linear-gradient"),
        overflow: "hidden",
      }),
    );
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });
});
