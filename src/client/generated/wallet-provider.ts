import z from "zod";

export type ProblemDetail = z.infer<typeof ProblemDetail>;
export const ProblemDetail = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

export type FiscalCode = z.infer<typeof FiscalCode>;
export const FiscalCode = z.string();

export type Id = z.infer<typeof Id>;
export const Id = z.string();

export type get_GetEntityConfiguration = typeof get_GetEntityConfiguration;
export const get_GetEntityConfiguration = {
  method: z.literal("GET"),
  path: z.literal("/.well-known/openid-federation"),
  parameters: z.never(),
  response: z.unknown(),
};

export type get_GetNonce = typeof get_GetNonce;
export const get_GetNonce = {
  method: z.literal("GET"),
  path: z.literal("/nonce"),
  parameters: z.never(),
  response: z.object({
    nonce: z.string(),
  }),
};

export type post_CreateWalletInstance = typeof post_CreateWalletInstance;
export const post_CreateWalletInstance = {
  method: z.literal("POST"),
  path: z.literal("/wallet-instances"),
  parameters: z.object({
    body: z.object({
      challenge: z.string(),
      key_attestation: z.string(),
      hardware_key_tag: z.string(),
    }),
  }),
  response: z.unknown(),
};

export type post_CreateWalletAttestation = typeof post_CreateWalletAttestation;
export const post_CreateWalletAttestation = {
  method: z.literal("POST"),
  path: z.literal("/token"),
  parameters: z.object({
    body: z.object({
      grant_type: z.literal("urn:ietf:params:oauth:grant-type:jwt-bearer"),
      assertion: z.string(),
    }),
  }),
  response: z.unknown(),
};

// <EndpointByMethod>
export const EndpointByMethod = {
  get: {
    "/.well-known/openid-federation": get_GetEntityConfiguration,
    "/nonce": get_GetNonce,
  },
  post: {
    "/wallet-instances": post_CreateWalletInstance,
    "/token": post_CreateWalletAttestation,
  },
};
export type EndpointByMethod = typeof EndpointByMethod;
// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type GetEndpoints = EndpointByMethod["get"];
export type PostEndpoints = EndpointByMethod["post"];
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
