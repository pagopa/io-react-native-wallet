import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import compact from "lodash/compact";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectKeyAttestation } from "../store/reducers/attestation";
import {
  selectCredential,
  selectStatusAsyncStatuses,
  selectStatuses,
} from "../store/reducers/credential";
import { selectPid } from "../store/selectors/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getCredentialStatusListThunk } from "../thunks/credential";

/**
 * This screen is used to test the status functionalities for the credentials already obtained.
 */
export const CredentialStatusScreen = () => {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectStatuses);
  const asyncStatus = useAppSelector(selectStatusAsyncStatuses);
  const ka = useAppSelector(selectKeyAttestation);

  const pid = useAppSelector(selectPid);
  const dc = useAppSelector(
    selectCredential("dc_sd_jwt_EuropeanDisabilityCard"),
  );

  const pari = useAppSelector(selectCredential("dc_sd_jwt_PariBonus"));

  useDebugInfo({
    dcStatus: status.dc_sd_jwt_EuropeanDisabilityCard,
    dcStatusState: asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
    kaStatus: status.keyAttestation,
    kaStatusState: asyncStatus.keyAttestation,
    pidStatus: status.PersonIdentificationData,
    pidStatusState: asyncStatus.PersonIdentificationData,
  });

  const statusListScenarios = compact<TestScenarioProp>([
    ka && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: ka,
            credentialType: "keyAttestation",
            format: "dc+sd-jwt",
          }),
        ),
      title: "Get Status List (KA)",
      ...asyncStatus.keyAttestation,
      icon: "locked",
      isPresent: !!status.keyAttestation,
    },
    pid && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: pid.credential,
            credentialType: "PersonIdentificationData",
            format: pid.format,
          }),
        ),
      title: "Get Status List (PID)",
      ...asyncStatus.PersonIdentificationData,
      icon: "fiscalCodeIndividual",
      isPresent: !!status.PersonIdentificationData,
    },
    dc && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: dc.credential,
            credentialType: "dc_sd_jwt_EuropeanDisabilityCard",
            format: dc.format,
          }),
        ),
      title: "Get Status List (DC)",
      ...asyncStatus.dc_sd_jwt_EuropeanDisabilityCard,
      icon: "accessibility",
      isPresent: !!status.dc_sd_jwt_EuropeanDisabilityCard,
    },
    pari && {
      onPress: () =>
        dispatch(
          getCredentialStatusListThunk({
            credential: pari.credential,
            credentialType: "dc_sd_jwt_PariBonus",
            format: pari.format,
          }),
        ),
      title: "Get Status List (Pari Bonus)",
      ...asyncStatus.dc_sd_jwt_PariBonus,
      icon: "bonus",
      isPresent: !!status.dc_sd_jwt_PariBonus,
    },
  ]);

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={statusListScenarios}
      keyExtractor={(item, index) => `${item?.title}-${index}`}
      renderItem={({ item }) => (
        <>
          {item && (
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
        </>
      )}
    />
  );
};
