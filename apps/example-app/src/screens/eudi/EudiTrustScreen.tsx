import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import {
  AnimatedRadio,
  Badge,
  BodySmall,
  H6,
  IOVisualCostants,
  LoadingSpinner,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

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
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={PROFILES}
      ItemSeparatorComponent={<VSpacer size={16} />}
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
        <H6>{profile}</H6>
        {getStatus()}
      </View>
      <View style={styles.radios}>
        <LoTERadio
          checked={isNegative === false}
          disabled={isLoading}
          label="Positive tests"
          onPress={() => fetchLoTE(false)}
        />
        <LoTERadio
          checked={isNegative === true}
          disabled={isLoading}
          label="Negative tests"
          onPress={() => fetchLoTE(true)}
        />
      </View>
    </View>
  );
};

/** Radio button with a small, regular weight label */
const LoTERadio = ({
  checked,
  disabled,
  label,
  onPress,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked, disabled }}
    disabled={disabled}
    onPress={onPress}
    style={styles.radio}
  >
    <AnimatedRadio
      checked={checked}
      disabled={disabled}
      onPress={onPress}
      size={20}
    />
    <BodySmall weight="Regular">{label}</BodySmall>
  </Pressable>
);

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  radio: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  radios: {
    gap: 8,
    marginTop: 2,
  },
});
