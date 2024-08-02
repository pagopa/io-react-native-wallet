/* eslint-disable react-native/no-inline-styles */
import React from "react";

import { useDispatch, useSelector } from "react-redux";
import { selectIoAuthToken } from "./store/reducers/sesssion";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import { SPID_IDPHINT, CIE_PIN, CIE_UAT } from "@env";

import LoginComponent from "./LoginComponent";
import TestCieL3Scenario from "./scenarios/component/TestCieL3Scenario";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { sessionReset } from "./store/actions/session";

const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

export const isCieUat = CIE_UAT === "true" || CIE_UAT === "1";
/**
 * PidContext is a tuple containing the PID and its crypto context.
 * It is used to obtain a credential and must be set after obtaining a PID.
 */
export type PidContext = { pid: string; pidCryptoContext: CryptoContext };

const MainComponent = () => {
  const [integrityContext, setIntegrityContext] = React.useState<
    IntegrityContext | undefined
  >();

  const [pidContext, setPidContext] = React.useState<PidContext>();
  const ioAuthToken = useSelector(selectIoAuthToken);
  const dispatch = useDispatch();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {ioAuthToken ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flex: 1 }}>
            <TestScenario
              title="Prepare Integrity Context"
              scenario={scenarios.prepareIntegrityContext(setIntegrityContext)}
            />

            <TestScenario
              title="Create Wallet Instance"
              scenario={scenarios.createWalletInstance(integrityContext!)}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Obtain Wallet Attestation"
              scenario={scenarios.getAttestation(integrityContext!)}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Get PID (SPID DEMO)"
              scenario={scenarios.getPid(
                integrityContext!,
                SPID_IDPHINT,
                setPidContext
              )}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Get PID (CIE DEMO)"
              scenario={scenarios.getPid(
                integrityContext!,
                isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
                setPidContext
              )}
              disabled={!integrityContext}
            />
            <TestCieL3Scenario
              title="Get PID (CIE+PIN)"
              integrityContext={integrityContext!}
              ciePin={CIE_PIN}
              isCieUat={isCieUat}
              idpHint={isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT}
              disabled={!integrityContext}
              setPid={setPidContext}
            />
            <TestScenario
              title="Get credential (mDL)"
              scenario={scenarios.getCredential(integrityContext!, pidContext!)}
              disabled={!integrityContext || !pidContext}
            />
          </View>
          <TouchableOpacity
            onPress={() => dispatch(sessionReset())}
            style={{
              backgroundColor: "#ffa5a5",
              padding: 10,
              marginVertical: 1,
              marginHorizontal: 1,
              alignItems: "center",
            }}
          >
            <Text>Logout from IO backend</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <LoginComponent />
      )}
    </SafeAreaView>
  );
};

export default MainComponent;
