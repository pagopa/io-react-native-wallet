import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { selectTrustValidationState } from "../store/reducers/trustValidation";
import { validateTrustChainThunk } from "../thunks/trustValidation";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { H3, IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { getEnv } from "../utils/environment";
import { selectEnv } from "../store/reducers/environment";

interface RelyingPartyUrls {
  pre: string;
  prod: string;
}

type BaseScenarioItem = {
  id: string;
  title: string;
  relyingPartyUrls: RelyingPartyUrls;
  icon: TestScenarioProp["icon"];
  successMessage: string;
};

interface ScenarioWithUrl {
  id: string;
  title: string;
  relyingPartyUrls: string;
  icon: TestScenarioProp["icon"];
  successMessage: string;
}

interface ScenarioData extends ScenarioWithUrl {
  onPress: () => void;
  isLoading: boolean;
  hasError: { status: boolean; error?: any };
  isDone: boolean;
  isPresent: boolean;
}

export const TrustScreen = () => {
  const dispatch = useAppDispatch();
  const { isValid, validatedChain, validationError, asyncStatus } =
    useAppSelector(selectTrustValidationState);
  const env = useAppSelector(selectEnv);
  const {
    WALLET_TA_BASE_URL,
    WALLET_PID_PROVIDER_BASE_URL,
    WALLET_EAA_PROVIDER_BASE_URL,
  } = getEnv(env);

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  useDebugInfo({
    trustValidationState: {
      isValid,
      validationError,
      asyncStatus,
      activeScenarioId,
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
        })
      );
    },
    [WALLET_TA_BASE_URL, dispatch]
  );

  // Add mock scenarios for testing purposes if needed
  const baseScenarioConfig = useMemo(
    (): BaseScenarioItem[] => [
      {
        id: "pagopa-wp",
        title: "Validate Trust Chain (PagoPA-WP)",
        relyingPartyUrls: {
          prod: "https://wallet.io.pagopa.it",
          pre: "https://foo11.blob.core.windows.net/foo",
        },
        icon: "locked",
        successMessage: "Chain Valid",
      },
      {
        id: "pagopa-rp",
        title: "Validate Trust Chain (PagoPA-RP)",
        relyingPartyUrls: {
          prod: "",
          pre: "https://foo11.blob.core.windows.net/rp-test",
        },
        icon: "locked",
        successMessage: "Chain Valid",
      },
      {
        id: "reg-toscana-rp",
        title: "Validate Trust Chain (Reg-Toscana-RP)",
        relyingPartyUrls: {
          prod: "",
          pre: "https://lab.auth.regione.toscana.it/r_toscan",
        },
        icon: "locked",
        successMessage: "Chain Valid",
      },
      {
        id: "ipzs-iss-pid",
        title: "Validate Trust Chain (IPZS-ISS-PID)",
        relyingPartyUrls: {
          prod: WALLET_PID_PROVIDER_BASE_URL,
          pre: WALLET_PID_PROVIDER_BASE_URL,
        },
        icon: "locked",
        successMessage: "Chain Valid",
      },
      {
        id: "ipzs-iss-eaa",
        title: "Validate Trust Chain (IPZS-ISS-EAA)",
        relyingPartyUrls: {
          prod: WALLET_EAA_PROVIDER_BASE_URL,
          pre: WALLET_EAA_PROVIDER_BASE_URL,
        },
        icon: "locked",
        successMessage: "Chain Valid",
      },
    ],
    [WALLET_PID_PROVIDER_BASE_URL, WALLET_EAA_PROVIDER_BASE_URL]
  );

  const scenariosWithUrls = useMemo((): ScenarioWithUrl[] => {
    return baseScenarioConfig.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      icon: scenario.icon,
      successMessage: scenario.successMessage,
      relyingPartyUrls:
        env === "pre"
          ? scenario.relyingPartyUrls.pre
          : scenario.relyingPartyUrls.prod,
    }));
  }, [baseScenarioConfig, env]);

  const scenarios: Array<ScenarioData> = useMemo(
    () =>
      scenariosWithUrls.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;
        return {
          ...scenario,
          onPress: () => handleValidate(scenario.relyingPartyUrls, scenario.id),
          isLoading: isActive && asyncStatus.isLoading,
          hasError:
            isActive && asyncStatus.hasError.status
              ? asyncStatus.hasError
              : { status: false },
          isDone: isActive && asyncStatus.isDone && isValid === true,
          isPresent: isActive && asyncStatus.isDone && isValid === true,
        };
      }),
    [scenariosWithUrls, asyncStatus, isValid, activeScenarioId, handleValidate]
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
              onPress={item.onPress}
              title={item.title}
              isLoading={item.isLoading}
              hasError={item.hasError}
              isDone={item.isDone}
              icon={item.icon}
              isPresent={item.isPresent}
              successMessage={item.successMessage}
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
              renderItem={({ item, index }) => (
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
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  tokenText: {
    fontWeight: "bold",
  },
  tokenTextSmall: {
    fontSize: 12,
  },
});
