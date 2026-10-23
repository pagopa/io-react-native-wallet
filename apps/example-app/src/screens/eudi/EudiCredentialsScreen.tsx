import {
  Body,
  H4,
  IOVisualCostants,
  Pictogram,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { EudiSharedTransitionBoundary } from "../../components/eudi/EudiSharedTransitionBoundary";
import { useEudiCredentialStatus } from "../../hooks/useEudiCredentialStatus";
import { useEudiParsedCredential } from "../../hooks/useEudiParsedCredential";
import {
  type EudiCredential,
  selectEudiCredentials,
} from "../../store/reducers/eudi/credentials";
import { useAppSelector } from "../../store/utils";
import { getCardStatus, getCredentialTransitionTag } from "../../utils/eudi";

/**
 * EUDI Wallet credentials screen, which lists every obtained credential to check its content.
 */
export const EudiCredentialsScreen = () => {
  const navigation = useNavigation();
  const credentials = useAppSelector(selectEudiCredentials);

  return (
    <EudiSharedTransitionBoundary>
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <FlatList
          contentContainerStyle={styles.content}
          data={credentials}
          ItemSeparatorComponent={VSpacer}
          keyExtractor={(item) => item.keyTag}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Pictogram name="empty" size={120} />
              <VSpacer />
              <H4 style={styles.centered}>No credentials yet</H4>
              <VSpacer size={8} />
              <Body style={styles.centered}>
                Scan a Credential Offer from the EUDI Wallet screen to obtain
                your first credential.
              </Body>
            </View>
          }
          ListFooterComponent={<VSpacer size={32} />}
          ListHeaderComponent={
            credentials.length > 0 ? (
              <>
                <Body>
                  {credentials.length === 1
                    ? "1 credential"
                    : `${credentials.length} credentials`}
                </Body>
                <VSpacer size={16} />
              </>
            ) : null
          }
          renderItem={({ item }) => (
            <CredentialItem
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
    </EudiSharedTransitionBoundary>
  );
};

/** Scale of a pressed card, which sinks slightly under the finger */
const PRESSED_SCALE = 0.97;

/** Credential card of the list, with the holder picture and status list status when the credential has them */
const CredentialItem = ({
  credential,
  onPress,
}: {
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
      <Animated.View style={pressStyle}>
        <EudiCredentialCard
          credential={credential}
          portrait={portrait}
          sharedTransitionTag={getCredentialTransitionTag(credential.keyTag)}
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
