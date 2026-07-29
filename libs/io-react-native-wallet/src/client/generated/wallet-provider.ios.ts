import z from "zod";

export type SetWalletInstanceStatusData = z.infer<typeof SetWalletInstanceStatusData>;
export const SetWalletInstanceStatusData = z.object({
  status: z.literal("REVOKED"),
});

export type RevocationReason = z.infer<typeof RevocationReason>;
export const RevocationReason = z.union([
  z.literal("CERTIFICATE_REVOKED_BY_ISSUER"),
  z.literal("NEW_WALLET_INSTANCE_CREATED"),
  z.literal("WALLET_INSTANCE_RENEWAL"),
  z.literal("REVOKED_BY_USER"),
]);

export type WalletInstanceData = z.infer<typeof WalletInstanceData>;
export const WalletInstanceData = z.object({
  id: z.string(),
  is_revoked: z.boolean(),
  revocation_reason: z.union([RevocationReason, z.undefined()]).optional(),
});

export type NonceDetailView = z.infer<typeof NonceDetailView>;
export const NonceDetailView = z.object({
  nonce: z.string(),
});

export type WalletAttestationsView = z.infer<typeof WalletAttestationsView>;
export const WalletAttestationsView = z.object({
  wallet_attestations: z.array(
    z.object({
      format: z.union([z.literal("jwt"), z.literal("dc+sd-jwt")]),
      wallet_attestation: z.string(),
    }),
  ),
});

export type WalletInstanceAttestation = z.infer<typeof WalletInstanceAttestation>;
export const WalletInstanceAttestation = z.object({
  wallet_instance_attestation: z.string(),
});

export type WalletUnitAttestation = z.infer<typeof WalletUnitAttestation>;
export const WalletUnitAttestation = z.object({
  wallet_unit_attestation: z.string(),
});

export type CreateWalletInstanceBody = z.infer<typeof CreateWalletInstanceBody>;
export const CreateWalletInstanceBody = z.object({
  challenge: z.string(),
  key_attestation: z.string(),
  hardware_key_tag: z.string(),
  is_renewal: z.union([z.boolean(), z.undefined()]).optional(),
});

export type CreateWalletAttestationBody = z.infer<typeof CreateWalletAttestationBody>;
export const CreateWalletAttestationBody = z.object({
  assertion: z.string(),
});

export type CreateWalletInstanceAttestationBody = z.infer<typeof CreateWalletInstanceAttestationBody>;
export const CreateWalletInstanceAttestationBody = z.string();

export type CreateWalletUnitAttestationBody = z.infer<typeof CreateWalletUnitAttestationBody>;
export const CreateWalletUnitAttestationBody = z.string();

export type CreateKeyAttestationBody = z.infer<typeof CreateKeyAttestationBody>;
export const CreateKeyAttestationBody = z.string();

export type KeyAttestation = z.infer<typeof KeyAttestation>;
export const KeyAttestation = z.object({
  key_attestation: z.string(),
});

export type ProblemJson = z.infer<typeof ProblemJson>;
export const ProblemJson = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

export type WhitelistedFiscalCodeData = z.infer<typeof WhitelistedFiscalCodeData>;
export const WhitelistedFiscalCodeData = z.object({
  whitelisted: z.boolean(),
  whitelistedAt: z.union([z.string(), z.undefined()]).optional(),
  fiscalCode: z.string(),
});

export type get_GetNonce = typeof get_GetNonce;
export const get_GetNonce = {
  method: z.literal("GET"),
  path: z.literal("/nonce"),
  parameters: z.never(),
  response: NonceDetailView,
};

export type post_CreateWalletInstance = typeof post_CreateWalletInstance;
export const post_CreateWalletInstance = {
  method: z.literal("POST"),
  path: z.literal("/wallet-instances"),
  parameters: z.object({
    body: CreateWalletInstanceBody,
  }),
  response: z.unknown(),
};

export type post_CreateWalletAttestation = typeof post_CreateWalletAttestation;
export const post_CreateWalletAttestation = {
  method: z.literal("POST"),
  path: z.literal("/wallet-attestations"),
  parameters: z.object({
    body: CreateWalletAttestationBody,
  }),
  response: WalletAttestationsView,
};

export type get_GetCurrentWalletInstanceStatus = typeof get_GetCurrentWalletInstanceStatus;
export const get_GetCurrentWalletInstanceStatus = {
  method: z.literal("GET"),
  path: z.literal("/wallet-instances/current/status"),
  parameters: z.never(),
  response: WalletInstanceData,
};

export type get_GetWalletInstanceStatus = typeof get_GetWalletInstanceStatus;
export const get_GetWalletInstanceStatus = {
  method: z.literal("GET"),
  path: z.literal("/wallet-instances/{id}/status"),
  parameters: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  response: WalletInstanceData,
};

export type put_SetWalletInstanceStatus = typeof put_SetWalletInstanceStatus;
export const put_SetWalletInstanceStatus = {
  method: z.literal("PUT"),
  path: z.literal("/wallet-instances/{id}/status"),
  parameters: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: SetWalletInstanceStatusData,
  }),
  response: z.unknown(),
};

export type get_HealthCheck = typeof get_HealthCheck;
export const get_HealthCheck = {
  method: z.literal("GET"),
  path: z.literal("/info"),
  parameters: z.never(),
  response: z.object({
    message: z.string().optional(),
  }),
};

export type get_IsFiscalCodeWhitelisted = typeof get_IsFiscalCodeWhitelisted;
export const get_IsFiscalCodeWhitelisted = {
  method: z.literal("GET"),
  path: z.literal("/whitelisted-fiscal-code"),
  parameters: z.never(),
  response: WhitelistedFiscalCodeData,
};

export type post_CreateWalletInstanceAttestation = typeof post_CreateWalletInstanceAttestation;
export const post_CreateWalletInstanceAttestation = {
  method: z.literal("POST"),
  path: z.literal("/wallet-instance-attestations"),
  parameters: z.object({
    header: z.object({
      "Content-Type": z.string().optional(),
    }),
    body: CreateWalletInstanceAttestationBody,
  }),
  response: WalletInstanceAttestation,
};

export type post_CreateWalletUnitAttestation = typeof post_CreateWalletUnitAttestation;
export const post_CreateWalletUnitAttestation = {
  method: z.literal("POST"),
  path: z.literal("/wallet-unit-attestations"),
  parameters: z.object({
    header: z.object({
      "Content-Type": z.string().optional(),
    }),
    body: CreateWalletUnitAttestationBody,
  }),
  response: WalletUnitAttestation,
};

export type post_CreateKeyAttestation = typeof post_CreateKeyAttestation;
export const post_CreateKeyAttestation = {
  method: z.literal("POST"),
  path: z.literal("/key-attestations"),
  parameters: z.object({
    header: z.object({
      "Content-Type": z.string().optional(),
    }),
    body: CreateKeyAttestationBody,
  }),
  response: KeyAttestation,
};

// <EndpointByMethod>
export const EndpointByMethod = {
  get: {
    "/nonce": get_GetNonce,
    "/wallet-instances/current/status": get_GetCurrentWalletInstanceStatus,
    "/wallet-instances/{id}/status": get_GetWalletInstanceStatus,
    "/info": get_HealthCheck,
    "/whitelisted-fiscal-code": get_IsFiscalCodeWhitelisted,
  },
  post: {
    "/wallet-instances": post_CreateWalletInstance,
    "/wallet-attestations": post_CreateWalletAttestation,
    "/wallet-instance-attestations": post_CreateWalletInstanceAttestation,
    "/wallet-unit-attestations": post_CreateWalletUnitAttestation,
    "/key-attestations": post_CreateKeyAttestation,
  },
  put: {
    "/wallet-instances/{id}/status": put_SetWalletInstanceStatus,
  },
};
export type EndpointByMethod = typeof EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type GetEndpoints = EndpointByMethod["get"];
export type PostEndpoints = EndpointByMethod["post"];
export type PutEndpoints = EndpointByMethod["put"];
export type AllEndpoints = EndpointByMethod[keyof EndpointByMethod];
// </EndpointByMethod.Shorthands>

// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown;
  query?: Record<string, unknown>;
  header?: Record<string, unknown>;
  path?: Record<string, unknown>;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | MutationMethod;

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined;
  response: unknown;
};

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string;
  method: Method;
  path: string;
  parameters?: TConfig["parameters"];
  meta: {
    alias: string;
    hasParameters: boolean;
    areParametersRequired: boolean;
  };
  response: TConfig["response"];
};

type Fetcher = (
  method: Method,
  url: string,
  parameters?: EndpointParameters | undefined,
) => Promise<Endpoint["response"]>;

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];

// </ApiClientTypes>

// <ApiClient>
export class ApiClient {
  baseUrl: string = "";

  constructor(public fetcher: Fetcher) {}

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  // <ApiClient.get>
  get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("get", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.get>

  // <ApiClient.post>
  post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("post", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.post>

  // <ApiClient.put>
  put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
    path: Path,
    ...params: MaybeOptionalArg<z.infer<TEndpoint["parameters"]>>
  ): Promise<z.infer<TEndpoint["response"]>> {
    return this.fetcher("put", this.baseUrl + path, params[0]) as Promise<z.infer<TEndpoint["response"]>>;
  }
  // </ApiClient.put>
}

export function createApiClient(fetcher: Fetcher, baseUrl?: string) {
  return new ApiClient(fetcher).setBaseUrl(baseUrl ?? "");
}

/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));
*/

// </ApiClient
