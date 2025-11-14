/* eslint-disable react-native/no-inline-styles */
import {
  ButtonSolid,
  H1,
  IOVisualCostants,
  ListItemAction,
  RadioGroup,
  TextInput,
  useIOToast,
  VSpacer,
  type RadioItem,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  envSet,
  loggingAddressSet,
  selectEnv,
  selectLoggingAddress,
} from "../store/reducers/environment";
import { instanceReset } from "../store/reducers/instance";
import { selectIoAuthToken, sessionReset } from "../store/reducers/session";
import type { EnvType } from "../store/types";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { validateLoggingAddress } from "../utils/environment";
import { initLogging } from "../utils/logging";

/**
 * Settings screen component which allows to change the environment and manage the session.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const session = useAppSelector(selectIoAuthToken);
  const currentDebugAddress = useAppSelector(selectLoggingAddress);
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
    <SafeAreaView
      style={{ flex: 1, margin: IOVisualCostants.appMarginDefault }}
    >
      <ScrollView>
        <H1>Environment</H1>
        <RadioGroup
          type="radioListItem"
          key="check_income"
          items={envRadioItems()}
          selectedItem={selectedEnv}
          onPress={toggleEnvionment}
        />
        <VSpacer />
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
