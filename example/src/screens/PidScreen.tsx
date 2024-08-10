import React from "react";
import { useAppDispatch } from "../store/dispatch";
import { useAppSelector } from "../store/utilts";
import TestScenario from "../components/TestScenario";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { getCredentialThunk } from "../thunks/credential";
import { CIE_UAT, SPID_IDPHINT } from "@env";
import { selectCredentialState } from "../store/reducers/credential";
import TestCieL3Scenario from "../components/TestCieL3Scenario";

export const isCieUat = CIE_UAT === "true" || CIE_UAT === "1";

const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

export const PidScreen = () => {
  const dispatch = useAppDispatch();

  const pidState = useAppSelector(
    selectCredentialState("PersonIdentificationData")
  );

  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  return (
    <>
      {hasIntegrityKeyTag ? (
        <>
          <TestScenario
            onPress={() =>
              dispatch(
                getCredentialThunk({
                  credentialType: "PersonIdentificationData",
                  idpHint: SPID_IDPHINT,
                })
              )
            }
            title="Get PID (SPID)"
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
          <TestScenario
            title="Get PID (CIE DEMO)"
            onPress={() =>
              dispatch(
                getCredentialThunk({
                  credentialType: "PersonIdentificationData",
                  idpHint: isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
                })
              )
            }
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
          <TestCieL3Scenario
            title="Get PID (CIE+PIN)"
            isCieUat={isCieUat}
            idpHint={isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT}
            isDisabled={!hasIntegrityKeyTag}
            isLoading={pidState.isLoading}
            hasError={pidState.hasError}
            isDone={pidState.isDone}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};
