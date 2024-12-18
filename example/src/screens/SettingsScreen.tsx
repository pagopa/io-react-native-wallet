/* eslint-disable react-native/no-inline-styles */
import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  H1,
  IOVisualCostants,
  ListItemAction,
} from "@pagopa/io-app-design-system";
import { selectSesssionId, sessionReset } from "../store/reducers/sesssion";
import { useDebugInfo } from "../hooks/useDebugInfo";

/**
 * Settings screen component which allows to change the environment and manage the session.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSesssionId);

  useDebugInfo({
    session,
  });

  return (
    <SafeAreaView
      style={{ flex: 1, margin: IOVisualCostants.appMarginDefault }}
    >
      <ScrollView>
        <H1>Session</H1>
        <ListItemAction
          variant="danger"
          icon="logout"
          label={"Reset"}
          onPress={() => dispatch(sessionReset())}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
