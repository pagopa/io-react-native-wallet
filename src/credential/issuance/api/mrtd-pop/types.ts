export type MrtdPayload = {
  dg1: string;
  dg11: string;
  sod_mrtd: string;
};

export type IasPayload = {
  ias_pk: string;
  sod_ias: string;
  challenge_signed: string;
};

export type MrtdProofChallengeInfo = {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  status: "require_interaction";
  type: "mrtd+ias";
  mrtd_auth_session: string;
  state: string;
  mrtd_pop_jwt_nonce: string;
  htu: string;
  htm: "POST";
};

export type MrtdPoPChallenge = {
  challenge: string;
  mrtd_pop_nonce: string;
  pop_verify_endpoint: string;
  mrz?: string;
};

export type MrtdPopVerificationResult = {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
};
