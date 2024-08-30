/* eslint-disable react-native/no-inline-styles */
import React, { useState } from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  H1,
  IOVisualCostants,
  ListItemAction,
  RadioGroup,
  VSpacer,
  type RadioItem,
} from "@pagopa/io-app-design-system";
import { envSet, selectEnv } from "../store/reducers/environment";
import { selectIoAuthToken, sessionReset } from "../store/reducers/sesssion";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { instanceReset } from "../store/reducers/instance";
import type { EnvType } from "../store/types";

/**
 * Settings screen component which allows to change the environment and manage the session.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);
  const session = useAppSelector(selectIoAuthToken);
  const [selectedEnv, setSelectedEnv] = useState<EnvType>(env);

  const toggleEnvionment = (selected: EnvType) => {
    dispatch(instanceReset()); // This resets the whole instance state beside the session
    dispatch(envSet(selected));
    setSelectedEnv(selected);
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
