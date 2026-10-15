import { render } from "@testing-library/react-native";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { EudiCredentialCard } from "../EudiCredentialCard";

jest.mock("@pagopa/io-app-design-system", () => ({
  AnimatedIOText: jest.requireActual("react-native").Text,
}));

jest.mock("../../../utils/eudi", () => ({
  getCredentialColors: () => ({
    backgroundColor: "#E8A0B4",
    textColor: "#3B1B28",
  }),
  getFormatLabel: () => "mdoc",
  withOpacity: () => "rgba(59, 27, 40, 0.18)",
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    Image: jest.requireActual("react-native").Image,
    View: jest.requireActual("react-native").View,
  },
}));

describe("EudiCredentialCard", () => {
  it("draws decoration on the shared card surface without texture image layers", () => {
    const { UNSAFE_getAllByType, UNSAFE_queryAllByType } = render(
      <EudiCredentialCard
        credential={{
          credentialConfigurationId: "mdl",
          format: "mso_mdoc",
          issuer: "Issuer",
        }}
        sharedTransitionTag="card"
      />,
    );

    const card = UNSAFE_getAllByType(View).find(
      (view) => view.props.sharedTransitionTag === "card",
    );
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
