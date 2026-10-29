import { ListItemRadio } from "@pagopa/io-app-design-system";
import React from "react";

import { useEudiCredentialStatus } from "../../hooks/useEudiCredentialStatus";
import { useEudiParsedCredential } from "../../hooks/useEudiParsedCredential";
import { selectEudiCredential } from "../../store/reducers/eudi/credentials";
import { useAppSelector } from "../../store/utils";
import { getCardStatus, getFormatLabel } from "../../utils/eudi";

/** Radio entry of a wallet credential that satisfies a request, with its format, issuer and status list status */
export const EudiCandidateCredential = ({
  keyTag,
  onPress,
  selected,
}: {
  keyTag: string;
  onPress: () => void;
  selected: boolean;
}) => {
  const credential = useAppSelector(selectEudiCredential(keyTag));
  const { parsed } = useEudiParsedCredential(credential);
  const revocation = useEudiCredentialStatus(parsed?.status);
  if (!credential) return null;
  const status = getCardStatus(revocation.status);
  return (
    <ListItemRadio
      description={[
        getFormatLabel(credential.format),
        credential.display?.issuerName ?? credential.issuer,
        status?.label,
      ]
        .filter(Boolean)
        .join(" · ")}
      // ListItemRadio ignores onPress and notifies the press only with onValueChange
      onValueChange={onPress}
      selected={selected}
      value={credential.display?.name ?? credential.credentialConfigurationId}
    />
  );
};
