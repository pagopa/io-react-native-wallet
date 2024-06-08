import parseUrl from "parse-url";
import * as z from "zod";
import { LoginResponseError } from "./utils/errors";

export interface LoginContext {
  openLogin: (url: string, redirectSchema: string) => Promise<string>;
}

const LoginResultShape = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});

type LoginResult = z.infer<typeof LoginResultShape>;

export const startLogin = async (
  loginContext: LoginContext
): Promise<LoginResult> => {
  const data = await loginContext.openLogin(
    "http://127.0.0.1:8000/redirect_page",
    "iowallet"
  );
  const urlParse = parseUrl(data);
  const result = LoginResultShape.safeParse(urlParse.query);
  if (result.success) {
    return result.data;
  } else {
    throw new LoginResponseError(result.error.message);
  }
};
