import {
  ButtonSolid,
  H1,
  IOVisualCostants,
  ListItemAction,
  RadioGroup,
  TextInput,
  useIOToast,
  VSpacer,
  RadioButtonLabel,
  type RadioItem,
  BodySmall,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { ItwVersion } from "@pagopa/io-react-native-wallet";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  envSet,
  loggingAddressSet,
  selectEnv,
  selectLoggingAddress,
  setItwVersion,
  selectItwVersion,
} from "../store/reducers/environment";
import { instanceReset } from "../store/reducers/instance";
import { selectIoAuthToken, sessionReset } from "../store/reducers/session";
import type { EnvType } from "../store/types";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { validateLoggingAddress } from "../utils/environment";
import { initLogging } from "../utils/logging";
import { SafeAreaView } from "react-native-safe-area-context";

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
    currentDebugAddress || ""
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
    } catch (e) {
      toast.error("Invalid logging server address");
    }
  };

  const envRadioItems = (): ReadonlyArray<RadioItem<EnvType>> => [
    {
      value: "Set PRE environment",
      description:
        "Use the PRE environment for testing. A Proxy might be needed to access the services. This action will reset the app state beside the session.",
      id: "pre",
    },
    {
      value: "Set PROD environment",
      description:
        "Use the PROD environment for testing. This action will reset the app state beside the session.",
      id: "prod",
    },
  ];

  useDebugInfo({
    session,
    env,
  });

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <VSpacer size={8} />
        <H1>Environment</H1>
        <RadioGroup
          type="radioListItem"
          key="check_income"
          items={envRadioItems()}
          selectedItem={selectedEnv}
          onPress={toggleEnvionment}
        />
        <VSpacer />
        <H1>IT-Wallet version</H1>
        <BodySmall>
          Change the version of IT-Wallet technical specifications.
        </BodySmall>
        <View style={styles.itwVersion}>
          {itwVersions.map((version) => (
            <RadioButtonLabel
              key={version}
              label={`v${version}`}
              checked={version === itwVersion}
              onValueChange={() =>
                dispatch(setItwVersion(version as ItwVersion))
              }
            />
          ))}
        </View>
        <H1>Logging Server</H1>
        <VSpacer size={8} />
        <TextInput
          value={debugAddress}
          onChangeText={(test) => setDebugAddress(test)}
          placeholder={"http://example.com:8080/sendLogs"}
        />
        <VSpacer size={8} />
        <ButtonSolid
          label="Set Logging Server"
          onPress={() => setLoggingServer()}
        />
        <VSpacer />
        <H1>Session</H1>
        <ListItemAction
          variant="danger"
          icon="logout"
          label={"Logout from IO Backend"}
          onPress={() => dispatch(sessionReset())}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
  itwVersion: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
    marginBottom: 24,
  },
});
