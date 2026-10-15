import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../../components/TestScenario";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  selectEudiLotes,
  selectEudiLotesFailures,
  selectEudiLotesStatus,
  selectEudiLotesTotal,
  selectEudiWrpac,
  selectEudiWrpacStatus,
} from "../../store/reducers/eudi/trust";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  bootstrapLoTEsThunk,
  validateCredentialIssuerMetadataWRPACThunk,
} from "../../thunks/eudi/trust";

/**
 * Screen to test the EUDI trust model: fetches and validates the Lists of Trusted Entities (LoTE).
 */
export const EudiTrustScreen = () => {
  const dispatch = useAppDispatch();
  const lotesStatus = useAppSelector(selectEudiLotesStatus);

  const lotes = useAppSelector(selectEudiLotes);
  const lotesFailures = useAppSelector(selectEudiLotesFailures);

  const lotesTotal = useAppSelector(selectEudiLotesTotal);
  const wrpac = useAppSelector(selectEudiWrpac);
  const wrpacStatus = useAppSelector(selectEudiWrpacStatus);

  useDebugInfo({
    ...Object.fromEntries(
      Object.entries(lotes).map(([profile, lote]) => [profile, lote.document]),
    ),
    lotesFailures,
    wrpac,
    wrpacStatus,
  });

  const getBadge = (): TestScenarioProp["badge"] => {
    if (!lotesStatus.isDone || lotesFailures.length === 0) {
      return undefined;
    }
    return lotesFailures.length >= lotesTotal
      ? { text: "ERROR", variant: "error" }
      : { text: "PARTIAL", variant: "warning" };
  };

  const scenarios: TestScenarioProp[] = [
    {
      ...lotesStatus,
      badge: getBadge(),
      icon: "docAttach",
      isPresent: lotesStatus.isDone,
      onPress: () => dispatch(bootstrapLoTEsThunk()),
      successMessage: "VALID",
      title: "Fetch and validate LoTEs",
    },
    {
      ...wrpacStatus,
      icon: "locked",
      isPresent: wrpacStatus.isDone,
      onPress: () => dispatch(validateCredentialIssuerMetadataWRPACThunk()),
      successMessage: "VALID",
      title: "Validate EUDIW Dev Issuer WRPAC",
    },
  ];

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item) => item.title}
      renderItem={({ item }) => (
        <>
          <TestScenario {...item} />
          <VSpacer />
        </>
      )}
    />
  );
};
