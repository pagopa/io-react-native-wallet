import type { ItwVersion } from "@pagopa/io-react-native-wallet";

import {
  BodySmall,
  ButtonSolid,
  H1,
  IOVisualCostants,
  ListItemAction,
  RadioButtonLabel,
  RadioGroup,
  type RadioItem,
  TextInput,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { EnvType } from "../store/types";

import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  envSet,
  loggingAddressSet,
  selectEnv,
  selectItwVersion,
  selectLoggingAddress,
  setItwVersion,
} from "../store/reducers/environment";
import { instanceReset } from "../store/reducers/instance";
import { selectIoAuthToken, sessionReset } from "../store/reducers/session";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { validateLoggingAddress } from "../utils/environment";
import { initLogging } from "../utils/logging";

const itwVersions: ItwVersion[] = ["1.0.0", "1.3.3"];

/**
 * Settings screen component which allows to change the environment and manage the session.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const session = useAppSelector(selectIoAuthToken);
  const currentDebugAddress = useAppSelector(selectLoggingAddress);
  const itwVersion = useAppSelector(selectItwVersion);
  const [selectedEnv, setSelectedEnv] = useState<EnvType>(env);
  const [debugAddress, setDebugAddress] = useState<string>(
    currentDebugAddress || "",
  );
  const toast = useIOToast();

  const toggleEnvionment = (selected: EnvType) => {
    dispatch(instanceReset()); // This resets the whole instance state beside the session
    dispatch(envSet(selected));
    setSelectedEnv(selected);
  };

  const setLoggingServer = () => {
    try {
      validateLoggingAddress(debugAddress);
      dispatch(loggingAddressSet(debugAddress));
      initLogging(debugAddress);
      toast.success("Logging server set correctly");
    } catch {
      toast.error("Invalid logging server address");
    }
  };

  const envRadioItems = (): readonly RadioItem<EnvType>[] => [
    {
      description:
        "Use the PRE environment for testing. A Proxy might be needed to access the services. This action will reset the app state beside the session.",
      id: "pre",
      value: "Set PRE environment",
    },
    {
      description:
        "Use the PROD environment for testing. This action will reset the app state beside the session.",
      id: "prod",
      value: "Set PROD environment",
    },
  ];

  useDebugInfo({
    env,
    session,
  });

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <VSpacer size={8} />
        <H1>Environment</H1>
        <RadioGroup
          items={envRadioItems()}
          key="check_income"
          onPress={toggleEnvionment}
          selectedItem={selectedEnv}
          type="radioListItem"
        />
        <VSpacer />
        <H1>IT-Wallet version</H1>
        <BodySmall>
          Change the version of IT-Wallet technical specifications.
        </BodySmall>
        <View style={styles.itwVersion}>
          {itwVersions.map((version) => (
            <RadioButtonLabel
              checked={version === itwVersion}
              key={version}
              label={`v${version}`}
              onValueChange={() =>
                dispatch(setItwVersion(version as ItwVersion))
              }
            />
          ))}
        </View>
        <H1>Logging Server</H1>
        <VSpacer size={8} />
        <TextInput
          onChangeText={(test) => setDebugAddress(test)}
          placeholder={"http://example.com:8080/sendLogs"}
          value={debugAddress}
        />
        <VSpacer size={8} />
        <ButtonSolid
          label="Set Logging Server"
          onPress={() => setLoggingServer()}
        />
        <VSpacer />
        <H1>Session</H1>
        <ListItemAction
          icon="logout"
          label={"Logout from IO Backend"}
          onPress={() => dispatch(sessionReset())}
          variant="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  itwVersion: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
    marginTop: 16,
  },
  safeArea: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
});
