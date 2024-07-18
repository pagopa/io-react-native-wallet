import { ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { type IntegrityContext } from "@pagopa/io-react-native-wallet";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import TestCieL3Scenario from "./scenarios/component/TestCieL3Scenario";
import { CIE_PIN, CIE_UAT, SPID_IDPHINT } from "@env";

/**
 * PidContext is a tuple containing the PID and its crypto context.
 * It is used to obtain a credential and must be set after obtaining a PID.
 */
export type PidContext = { pid: string; pidCryptoContext: CryptoContext };

const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

export const isCieUat = CIE_UAT === "true" || CIE_UAT === "1";

export default function App() {
  const [integrityContext, setIntegrityContext] = React.useState<
    IntegrityContext | undefined
  >();
  const [pidContext, setPidContext] = React.useState<PidContext>();
  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <ScrollView>
          <TestScenario
            title="Prepare Integrity Context"
            scenario={scenarios.prepareIntegrityContext(setIntegrityContext)}
          />

          <>
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
          </>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
