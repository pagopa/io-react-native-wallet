import {
  IOVisualCostants,
  ListItemSwitch,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../../components/TestScenario";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  selectEudiIsNegativeLotes,
  selectEudiLotes,
  selectEudiLotesFailures,
  selectEudiLotesStatus,
  selectEudiLotesTotal,
} from "../../store/reducers/eudi/trust";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { bootstrapLoTEsThunk } from "../../thunks/eudi/trust";

/**
 * Screen to test the EUDI trust model: fetches and validates the Lists of Trusted Entities (LoTE)
 * for positive and negative tests.
 */
export const EudiTrustScreen = () => {
  const dispatch = useAppDispatch();
  const lotesStatus = useAppSelector(selectEudiLotesStatus);
  const lotes = useAppSelector(selectEudiLotes);
  const lotesFailures = useAppSelector(selectEudiLotesFailures);
  const lotesTotal = useAppSelector(selectEudiLotesTotal);
  const isNegativeLotes = useAppSelector(selectEudiIsNegativeLotes);
  // Starts from the downloaded LoTEs, and only applies to the next bootstrap
  const [useNegativeLotes, setUseNegativeLotes] = useState(isNegativeLotes);

  useDebugInfo({
    ...Object.fromEntries(
      Object.entries(lotes).map(([profile, lote]) => [profile, lote.document]),
    ),
    lotesFailures,
  });

  const getBadge: TestScenarioProp["getBadge"] = () => {
    if (Object.keys(lotes).length === lotesTotal) {
      return { text: "OK", variant: "success" };
    }
    return lotesFailures.length === lotesTotal
      ? { text: "ERROR", variant: "error" }
      : { text: "PARTIAL", variant: "warning" };
  };

  const scenarios: TestScenarioProp[] = [
    {
      ...lotesStatus,
      getBadge,
      icon: "docAttach",
      isPresent: lotesStatus.isDone,
      onPress: () => dispatch(bootstrapLoTEsThunk(useNegativeLotes)),
      successMessage: "OK",
      title: "Fetch and validate LoTEs",
    },
  ];

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item) => item.title}
      ListHeaderComponent={
        <>
          <ListItemSwitch
            disabled={lotesStatus.isLoading}
            label="LoTEs for negative tests"
            onSwitchValueChange={setUseNegativeLotes}
            value={useNegativeLotes}
          />
          <VSpacer />
        </>
      }
      renderItem={({ item }) => (
        <>
          <TestScenario {...item} />
          <VSpacer />
        </>
      )}
    />
  );
};
