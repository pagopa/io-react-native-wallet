import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import {
  Badge,
  Divider,
  H4,
  IOVisualCostants,
  LoadingSpinner,
  RadioGroup,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { useDebugInfo } from "../../hooks/useDebugInfo";
import { selectEudiLoTEsWithStatus } from "../../store/reducers/eudi/trust";
import { AsyncStatus } from "../../store/types";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { fetchLoTEThunk } from "../../thunks/eudi/trust";
import { EUDI_LOTE_URLS } from "../../utils/eudiTrust";

// Display only lists with an actual url
const PROFILES = Object.entries(EUDI_LOTE_URLS)
  .filter(([, value]) => value.startsWith("http"))
  .map(([key]) => key) as Eudi.Trust.LoTEProfile[];

type TestType = "negative" | "positive";

/**
 * Screen to test the EUDI trust model: fetches and validates each List of Trusted Entities (LoTE),
 * either for positive or for negative tests.
 */
export const EudiTrustScreen = () => {
  const lotes = useAppSelector(selectEudiLoTEsWithStatus);

  const debugData = Object.entries(lotes).reduce(
    (acc, [profile, { lote, status }]) => {
      if (lote) acc[profile] = lote?.document;
      if (status) acc[`status:${profile}`] = status;
      return acc;
    },
    {} as Record<string, AsyncStatus | Eudi.Trust.ParsedLoTE["document"]>,
  );

  useDebugInfo(debugData);

  return (
    <FlatList
      contentContainerStyle={{
        paddingHorizontal: IOVisualCostants.appMarginDefault,
        paddingVertical: 16,
      }}
      data={PROFILES}
      ItemSeparatorComponent={
        <>
          <VSpacer size={16} />
          <Divider />
          <VSpacer size={16} />
        </>
      }
      keyExtractor={(profile) => profile}
      renderItem={({ item }) => <LoTEItem profile={item} />}
    />
  );
};

/** A LoTE with its fetching status, and the buttons to fetch it for positive or negative tests */
const LoTEItem = ({ profile }: { profile: Eudi.Trust.LoTEProfile }) => {
  const dispatch = useAppDispatch();
  const { isNegative, lote, status } =
    useAppSelector(selectEudiLoTEsWithStatus)[profile] ?? {};
  const isLoading = status?.isLoading === true;

  const fetchLoTE = (isNegative: boolean) =>
    dispatch(fetchLoTEThunk({ isNegative, profile }));

  const getStatus = () => {
    if (isLoading) {
      return <LoadingSpinner size={24} />;
    }
    if (lote) {
      return <Badge text="OK" variant="success" />;
    }
    if (status?.hasError.status) {
      return <Badge text="ERROR" variant="error" />;
    }
    return undefined;
  };

  return (
    <View>
      <View style={styles.header}>
        <H4>{profile}</H4>
        {getStatus()}
      </View>
      <RadioGroup<TestType>
        items={[
          {
            description: "Fetch and validate the list as expected",
            disabled: isLoading,
            id: "positive",
            value: "Positive tests",
          },
          {
            description: "Fetch the list variant that must fail validation",
            disabled: isLoading,
            id: "negative",
            value: "Negative tests",
          },
        ]}
        onPress={(type) => fetchLoTE(type === "negative")}
        selectedItem={
          isNegative === undefined
            ? undefined
            : isNegative
              ? "negative"
              : "positive"
        }
        type="radioListItem"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
});
