import {
  Body,
  H4,
  IOVisualCostants,
  ListItemAction,
  ListItemSwitch,
  Pictogram,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import {
  useEudiCredentialStatus,
  useEudiStatusListsRefresh,
} from "../../hooks/useEudiCredentialStatus";
import { useEudiParsedCredential } from "../../hooks/useEudiParsedCredential";
import {
  type EudiCredential,
  selectEudiCredentials,
} from "../../store/reducers/eudi/credentials";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { deleteEudiCredentialThunk } from "../../thunks/eudi/issuance";
import { getCardStatus } from "../../utils/eudi";

/**
 * EUDI Wallet credentials screen, which lists every obtained credential to check its content.
 */
export const EudiCredentialsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const credentials = useAppSelector(selectEudiCredentials);
  const { onRefresh, refreshing } = useEudiStatusListsRefresh();
  const [stacked, setStacked] = useState(false);

  const deleteAllCredentials = () =>
    Alert.alert(
      "Delete all credentials",
      "Every credential and its key will be removed from the device.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () =>
            Promise.all(
              credentials.map(({ keyTag }) =>
                dispatch(deleteEudiCredentialThunk(keyTag)).unwrap(),
              ),
            ).catch((e: unknown) =>
              Alert.alert("Unable to delete the credentials", String(e)),
            ),
          style: "destructive",
          text: "Delete all",
        },
      ],
    );

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={styles.content}
        data={credentials}
        ItemSeparatorComponent={stacked ? undefined : VSpacer}
        keyExtractor={(item) => item.keyTag}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Pictogram name="empty" size={120} />
            <VSpacer />
            <H4 style={styles.centered}>No credentials yet</H4>
            <VSpacer size={8} />
            <Body style={styles.centered}>
              Scan a Credential Offer from the EUDI Wallet screen to obtain your
              first credential.
            </Body>
          </View>
        }
        ListFooterComponent={
          <>
            {credentials.length > 0 && (
              <>
                <VSpacer size={24} />
                <ListItemAction
                  icon="trashcan"
                  label="Delete all credentials"
                  onPress={deleteAllCredentials}
                  variant="danger"
                />
              </>
            )}
            <VSpacer size={32} />
          </>
        }
        ListHeaderComponent={
          credentials.length > 0 ? (
            <>
              <Body>
                {credentials.length === 1
                  ? "1 credential"
                  : `${credentials.length} credentials`}
              </Body>
              {credentials.length > 1 && (
                <ListItemSwitch
                  label="Stack cards"
                  onSwitchValueChange={setStacked}
                  value={stacked}
                />
              )}
              <VSpacer size={16} />
            </>
          ) : null
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={({ index, item }) => (
          <CredentialItem
            collapsed={stacked && index < credentials.length - 1}
            credential={item}
            onPress={() =>
              navigation.navigate("EudiCredentialDetail", {
                keyTag: item.keyTag,
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
};

/** Scale of a pressed card, which sinks slightly under the finger */
const PRESSED_SCALE = 0.97;

/** Visible height of a stacked card, covered by the next one but for its name and issuer */
const STACKED_CARD_HEIGHT = 76;

/** Credential card of the list, with the holder picture and status list status when the credential has them */
const CredentialItem = ({
  collapsed,
  credential,
  onPress,
}: {
  /** Whether the card is stacked under the next one, showing only its top */
  collapsed: boolean;
  credential: EudiCredential;
  onPress: () => void;
}) => {
  const { parsed, portrait } = useEudiParsedCredential(credential);
  const revocation = useEudiCredentialStatus(parsed?.status);
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      accessibilityLabel={
        credential.display?.name ?? credential.credentialConfigurationId
      }
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(PRESSED_SCALE, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
    >
      <Animated.View
        layout={LinearTransition}
        style={[pressStyle, collapsed && styles.collapsed]}
      >
        <EudiCredentialCard
          credential={credential}
          portrait={portrait}
          status={getCardStatus(revocation.status)}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  centered: {
    textAlign: "center",
  },
  // The card overflows the item and the next item, drawn later, covers it
  collapsed: {
    height: STACKED_CARD_HEIGHT,
  },
  content: {
    flexGrow: 1,
    padding: IOVisualCostants.appMarginDefault,
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
