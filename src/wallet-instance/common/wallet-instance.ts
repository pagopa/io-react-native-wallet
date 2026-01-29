import { getWalletProviderClient } from "../../client";
import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../../utils/errors";
import { LogLevel, Logger } from "../../utils/logging";
import type { WalletInstanceApi } from "../api";

export const createWalletInstance: WalletInstanceApi["createWalletInstance"] =
  async (context) => {
    const { integrityContext } = context;
    const api = getWalletProviderClient(context);

    //1. Obtain nonce
    const challenge = await api
      .get("/nonce")
      .then((response) => response.nonce);

    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${context.walletProviderBaseUrl}: ${challenge}`
    );

    const keyAttestation = await integrityContext.getAttestation(challenge);

    const hardwareKeyTag = integrityContext.getHardwareKeyTag();

    Logger.log(
      LogLevel.DEBUG,
      `Key attestation: ${keyAttestation}\nAssociated hardware key tag: ${hardwareKeyTag}`
    );

    //2. Create Wallet Instance
    await api
      .post("/wallet-instances", {
        body: {
          challenge,
          key_attestation: keyAttestation,
          hardware_key_tag: hardwareKeyTag,
        },
      })
      .catch(handleCreateWalletInstanceError);

    return hardwareKeyTag;
  };

const handleCreateWalletInstanceError = (e: unknown) => {
  Logger.log(
    LogLevel.ERROR,
    `An error occurred while calling /wallet-instances endpoint: ${e}`
  );

  if (!(e instanceof WalletProviderResponseError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(WalletProviderResponseError)
    .handle(409, {
      code: WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed,
      message:
        "Unable to create a wallet instance with a device that failed the integrity check",
    })
    .handle("*", {
      code: WalletProviderResponseErrorCodes.WalletInstanceCreationFailed,
      message: "Unable to create wallet instance",
    })
    .buildFrom(e);
};

export const revokeWalletInstance: WalletInstanceApi["revokeWalletInstance"] =
  async (context) => {
    const api = getWalletProviderClient(context);

    await api.put("/wallet-instances/{id}/status", {
      path: { id: context.id },
      body: { status: "REVOKED" },
    });
  };

export const getWalletInstanceStatus: WalletInstanceApi["getWalletInstanceStatus"] =
  (context) => {
    const api = getWalletProviderClient(context);

    return api.get("/wallet-instances/{id}/status", {
      path: { id: context.id },
    });
  };

export const getCurrentWalletInstanceStatus: WalletInstanceApi["getCurrentWalletInstanceStatus"] =
  (context) => {
    const api = getWalletProviderClient(context);

    return api.get("/wallet-instances/current/status");
  };
