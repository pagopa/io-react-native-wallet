import { Trust } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

const subordinateUrl = "https://api.eudi-wallet-it-pid-provider.it/ci";
const accreditationBodyUrl =
  "https://demo.federation.eudi.wallet.developers.italia.it/";

export default async () => {
  try {
    const statement = await Trust.getEntityStatement(
      accreditationBodyUrl,
      subordinateUrl
    );

    return result(statement);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
