export interface IasPayload {
  challenge_signed: string;
  ias_pk: string;
  sod_ias: string;
}

export interface MrtdPayload {
  dg1: string;
  dg11: string;
  sod_mrtd: string;
}

export interface MrtdPoPChallenge {
  challenge: string;
  mrtd_pop_nonce: string;
  mrz?: string;
  pop_verify_endpoint: string;
}

export interface MrtdPopVerificationResult {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
}

export interface MrtdProofChallengeInfo {
  aud: string;
  exp: number;
  htm: "POST";
  htu: string;
  iat: number;
  iss: string;
  mrtd_auth_session: string;
  mrtd_pop_jwt_nonce: string;
  state: string;
  status: "require_interaction";
  type: "mrtd+ias";
}
