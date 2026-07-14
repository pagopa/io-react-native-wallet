import type { SerializedError } from "@reduxjs/toolkit";

import { H3, IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import type { AsyncStatus } from "../store/types";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectTrustValidationState } from "../store/reducers/trustValidation";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { validateTrustChainThunk } from "../thunks/trustValidation";
import { getEnv } from "../utils/environment";

interface BaseScenarioItem {
  icon: TestScenarioProp["icon"];
  id: string;
  relyingPartyUrls: RelyingPartyUrls;
  successMessage: string;
  title: string;
}

interface RelyingPartyUrls {
  pre: string;
  prod: string;
}

interface ScenarioData extends ScenarioWithUrl {
  hasError: AsyncStatus["hasError"];
  isDone: boolean;
  isLoading: boolean;
  isPresent: boolean;
  onPress: () => void;
}

interface ScenarioWithUrl {
  icon: TestScenarioProp["icon"];
  id: string;
  relyingPartyUrls: string;
  successMessage: string;
  title: string;
}

export const TrustScreen = () => {
  const dispatch = useAppDispatch();
  const { asyncStatus, isValid, validatedChain, validationError } =
    useAppSelector(selectTrustValidationState);
  const env = useAppSelector(selectEnv);
  const {
    WALLET_EAA_PROVIDER_BASE_URL,
    WALLET_PID_PROVIDER_BASE_URL,
    WALLET_TA_BASE_URL,
  } = getEnv(env);
  const itwVersion = useAppSelector(selectItwVersion);

  const [activeScenarioId, setActiveScenarioId] = useState<null | string>(null);
  useDebugInfo({
    trustValidationState: {
      activeScenarioId,
      asyncStatus,
      isValid,
      validationError,
    },
    validatedChain,
  });

  const handleValidate = useCallback(
    (relyingPartyUrl: string, scenarioId: string) => {
      setActiveScenarioId(scenarioId);
      dispatch(
        validateTrustChainThunk({
          relyingPartyUrl,
          trustAnchorUrl: WALLET_TA_BASE_URL,
        }),
      );
    },
    [WALLET_TA_BASE_URL, dispatch],
  );

  // Add mock scenarios for testing purposes if needed
  const baseScenarioConfig = useMemo(
    (): BaseScenarioItem[] => [
      {
        icon: "locked",
        id: "pagopa-wp",
        relyingPartyUrls: {
          pre: "https://foo11.blob.core.windows.net/foo",
          prod: "https://wallet.io.pagopa.it",
        },
        successMessage: "Chain Valid",
        title: "Validate Trust Chain (PagoPA-WP)",
      },
      {
        icon: "locked",
        id: "pagopa-rp",
        relyingPartyUrls: {
          pre: "https://foo11.blob.core.windows.net/rp-test",
          prod: "https://foo11.blob.core.windows.net/rp-test",
        },
        successMessage: "Chain Valid",
        title: "Validate Trust Chain (PagoPA-RP)",
      },
      {
        icon: "locked",
        id: "reg-toscana-rp",
        relyingPartyUrls: {
          pre: "https://lab.auth.regione.toscana.it/r_toscan",
          prod: "https://auth.regione.toscana.it/r_toscan",
        },
        successMessage: "Chain Valid",
        title: "Validate Trust Chain (Reg-Toscana-RP)",
      },
      {
        icon: "locked",
        id: "ipzs-iss-pid",
        relyingPartyUrls: {
          pre: WALLET_PID_PROVIDER_BASE_URL.value(itwVersion),
          prod: WALLET_PID_PROVIDER_BASE_URL.value(itwVersion),
        },
        successMessage: "Chain Valid",
        title: "Validate Trust Chain (IPZS-ISS-PID)",
      },
      {
        icon: "locked",
        id: "ipzs-iss-eaa",
        relyingPartyUrls: {
          pre: WALLET_EAA_PROVIDER_BASE_URL.value(itwVersion),
          prod: WALLET_EAA_PROVIDER_BASE_URL.value(itwVersion),
        },
        successMessage: "Chain Valid",
        title: "Validate Trust Chain (IPZS-ISS-EAA)",
      },
    ],
    [WALLET_PID_PROVIDER_BASE_URL, WALLET_EAA_PROVIDER_BASE_URL, itwVersion],
  );

  const scenariosWithUrls = useMemo(
    (): ScenarioWithUrl[] =>
      baseScenarioConfig.map((scenario) => ({
        icon: scenario.icon,
        id: scenario.id,
        relyingPartyUrls:
          env === "pre"
            ? scenario.relyingPartyUrls.pre
            : scenario.relyingPartyUrls.prod,
        successMessage: scenario.successMessage,
        title: scenario.title,
      })),
    [baseScenarioConfig, env],
  );

  const scenarios: ScenarioData[] = useMemo(
    () =>
      scenariosWithUrls.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;
        return {
          ...scenario,
          hasError:
            isActive && asyncStatus.hasError.status
              ? asyncStatus.hasError
              : { error: undefined, status: false },
          isDone: isActive && asyncStatus.isDone && isValid === true,
          isLoading: isActive && asyncStatus.isLoading,
          isPresent: isActive && asyncStatus.isDone && isValid === true,
          onPress: () => handleValidate(scenario.relyingPartyUrls, scenario.id),
        };
      }),
    [scenariosWithUrls, asyncStatus, isValid, activeScenarioId, handleValidate],
  );

  const showGlobalFeedbackForActiveScenario =
    activeScenarioId && (asyncStatus.isDone || asyncStatus.hasError);

  return (
    <View style={styles.container}>
      <FlatList
        data={scenarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <>
            <TestScenario
              hasError={item.hasError}
              icon={item.icon}
              isDone={item.isDone}
              isLoading={item.isLoading}
              isPresent={item.isPresent}
              onPress={item.onPress}
              successMessage={item.successMessage}
              title={item.title}
            />
            <VSpacer />
          </>
        )}
      />
      {showGlobalFeedbackForActiveScenario &&
        asyncStatus.isDone &&
        isValid &&
        validatedChain && (
          <>
            <H3>Validated Chain Tokens:</H3>
            <FlatList
              data={validatedChain}
              keyExtractor={(token, index) =>
                `token-${index}-${token.header.kid || index}`
              }
              renderItem={({ index, item }) => (
                <View style={styles.tokenItem}>
                  <Text style={styles.tokenText}>Token {index + 1}:</Text>
                  <Text style={styles.tokenTextSmall}>
                    H_ISS: {item.payload.iss}
                  </Text>
                  <Text style={styles.tokenTextSmall}>
                    H_SUB: {item.payload.sub}
                  </Text>
                  <Text style={styles.tokenTextSmall}>
                    H_KID: {item.header.kid}
                  </Text>
                </View>
              )}
            />
          </>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: IOVisualCostants.appMarginDefault,
  },
  tokenItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginTop: 8,
    padding: 8,
  },
  tokenText: {
    fontWeight: "bold",
  },
  tokenTextSmall: {
    fontSize: 12,
  },
});
