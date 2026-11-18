import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  selectCredential,
  selectCredentialAsyncStatus,
} from "../store/reducers/credential";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getCredentialThunk } from "../thunks/credential";

/**
 * Component (screen in a future PR) to test the credential functionalities.
 * This includes issuing a credential and getting its status attestation.
 */

export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const mdlState = useAppSelector(
    selectCredentialAsyncStatus("org.iso.18013.5.1.mDL"),
  );
  const mdl = useAppSelector(selectCredential("org.iso.18013.5.1.mDL"));

  const dcState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_EuropeanDisabilityCard"),
  );
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard"),
  );

  const pariState = useAppSelector(
    selectCredentialAsyncStatus("dc_sd_jwt_PariBonus"),
  );
  const pari = useAppSelector(selectCredential("dc_sd_jwt_PariBonus"));

  useDebugInfo({
    dc,
    dcState,
    mdl,
    mdlState,
    pari,
    pariState,
  });

  const scenarios: TestScenarioProp[] = [
    {
      hasError: mdlState.hasError,
      icon: "car",
      isDone: mdlState.isDone,
      isLoading: mdlState.isLoading,
      isPresent: !!mdl,
      onPress: () =>
        dispatch(
          getCredentialThunk({ credentialType: "org.iso.18013.5.1.mDL" }),
        ),
      title: "Get credential (MDL in Mdoc)",
    },
    {
      hasError: dcState.hasError,
      icon: "accessibility",
      isDone: dcState.isDone,
      isLoading: dcState.isLoading,
      isPresent: !!dc,
      onPress: () =>
        dispatch(
          getCredentialThunk({
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
          }),
        ),
      title: "Get credential (DC in SD-JWT)",
    },
    {
      hasError: pariState.hasError,
      icon: "bonus",
      isDone: pariState.isDone,
      isLoading: pariState.isLoading,
      isPresent: !!pari,
      onPress: () =>
        dispatch(getCredentialThunk({ credentialType: "dc_sd_jwt_PariBonus" })),
      title: "Get credential (Pari Bonus in SD-JWT)",
    },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        ListFooterComponent={<VSpacer size={32} />}
        renderItem={({ item }) => (
          <>
            <TestScenario
              hasError={item.hasError}
              icon={item.icon}
              isDone={item.isDone}
              isLoading={item.isLoading}
              isPresent={item.isPresent}
              onPress={item.onPress}
              title={item.title}
            />
            <VSpacer />
          </>
        )}
      />
    </SafeAreaView>
  );
};
