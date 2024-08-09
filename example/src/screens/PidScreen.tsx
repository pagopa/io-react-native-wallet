import React from "react";
import { useAppDispatch } from "../store/dispatch";
import { useAppSelector } from "../store/utilts";
import TestScenario from "../scenarios/component/TestScenario";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { getCredentialThunk } from "../thunks/get-credential";
import { CIE_UAT, SPID_IDPHINT } from "@env";
import { selectCredentialState } from "../store/reducers/credential";

export const isCieUat = CIE_UAT === "true" || CIE_UAT === "1";

const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

export const PidScreen = () => {
  const dispatch = useAppDispatch();

  const {
    isLoading: isLoadingPid,
    hasError: hasErrorPid,
    isDone: isDonePid,
  } = useAppSelector(selectCredentialState("PersonIdentificationData"));

  const {
    isLoading: isLoadingAtt,
    hasError: hasErrorAtt,
    isDone: isDoneAtt,
  } = useAppSelector(selectCredentialState("PersonIdentificationData"));

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
            isLoading={isLoadingPid}
            hasError={hasErrorPid}
            isDone={isDonePid}
          />
          <TestScenario
            title="Get PID (CIE DEMO)"
            isLoading={isLoadingAtt}
            hasError={hasErrorAtt}
            isDone={isDoneAtt}
            onPress={() =>
              dispatch(
                getCredentialThunk({
                  credentialType: "PersonIdentificationData",
                  idpHint: isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT,
                })
              )
            }
          />
          {/* <TestCieL3Scenario
        title="Get PID (CIE+PIN)"
        integrityContext={integrityContext!}
        isCieUat={isCieUat}
        idpHint={isCieUat ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT}
        disabled={!integrityContext}
        setPid={setPidContext}
      /> */}
        </>
      ) : (
        <></>
      )}
    </>
  );
};
