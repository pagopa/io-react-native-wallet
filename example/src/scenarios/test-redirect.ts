import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";
import { error, result } from "./types";
import { TestLoginContext } from "@pagopa/io-react-native-wallet";

/**
 * Obtain a Wallet Instance Attestation by providing an integrity context which must be the same
 * used when creating the Wallet Instance.
 */
export default () => async () => {
  try {
    const loginContext: TestLoginContext.LoginContext = {
      openLogin: openAuthenticationSession,
    };
    const res = await TestLoginContext.startLogin(loginContext);
    console.log(res);
    return result(res);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
