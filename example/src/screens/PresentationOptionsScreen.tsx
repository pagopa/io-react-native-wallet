import React from "react";

import { useNavigation } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../store/utils";

import {
  selectCredentialIdsForPresentation,
  toggleCredentialId,
} from "../store/reducers/presentation";
import { selectEuropeanCredentials } from "../store/reducers/credential";

import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  Body,
  ContentWrapper,
  ForceScrollDownView,
  ListItemCheckbox,
  VSpacer,
} from "@pagopa/io-app-design-system";
import type { EuropeanCredentialWithId } from "../store/types";

/**
 * Screen to configure several options before a remote presentation.
 * It allows to select credentials to use in presentations.
 */
export const PresentationOptionsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const europeanCredentials = useAppSelector(selectEuropeanCredentials);
  const selectedCredentialIds = useAppSelector(
    selectCredentialIdsForPresentation
  );

  useDebugInfo({
    selectedCredentialIds,
  });

  const getDescription = ({
    format,
    parsedCredential,
  }: EuropeanCredentialWithId) => {
    if (format === "dc+sd-jwt") {
      return `${parsedCredential.issuing_authority?.value} | ${parsedCredential.issuing_country?.value}`;
    }
    return `${parsedCredential["org.iso.18013.5.1:issuing_authority"]?.value} | ${parsedCredential["org.iso.18013.5.1:issuing_country"]?.value}`;
  };

  return (
    <ForceScrollDownView
      footerActions={{
        actions: {
          type: "SingleButton",
          primary: {
            label: "Continue",
            onPress: () => navigation.navigate("Presentations"),
          },
        },
      }}
    >
      <ContentWrapper>
        <VSpacer size={16} />
        <Body>Select the credentials to use for Remote Presentation.</Body>
        <VSpacer size={24} />
        {europeanCredentials.map((credential, i) => (
          <ListItemCheckbox
            key={`${credential.credentialConfigurationId}-${i}`}
            value={credential.credentialType}
            description={getDescription(credential)}
            onValueChange={() => dispatch(toggleCredentialId(credential.id))}
            selected={selectedCredentialIds.includes(credential.id)}
          />
        ))}
      </ContentWrapper>
    </ForceScrollDownView>
  );
};
