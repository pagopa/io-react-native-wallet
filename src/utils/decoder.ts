import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import type { JWTDecodeResult } from "@pagopa/io-react-native-jwt/lib/typescript/types";
import { ValidationFailed } from "./errors";

/*
 * Decode a form_post.jwt and return the final JWT.
 * The formData here is in form_post.jwt format as defined in
 * JWT Secured Authorization Response Mode for OAuth 2.0 (JARM)
 * HTTP/1.1 200 OK
 *   Content-Type: text/html;charset=UTF-8
 *   Cache-Control: no-cache, no-store
 *   Pragma: no-cache
 *
 *   <html>
 *   <head><title>Submit This Form</title></head>
 *   <body onload="javascript:document.forms[0].submit()">
 *     <form method="post" action="https://client.example.com/cb">
 *       <input type="hidden" name="response"
 *       value="eyJhbGciOiJSUz....."/>
 *       </form>
 *    </body>
 *   </html>
 */
export const getJwtFromFormPost = async (
  formData: string
): Promise<{ jwt: string; decodedJwt: JWTDecodeResult }> => {
  const formPostRegex = /value\s*=\s*"((.|\n)*)"/gm;
  const lineExpressionRegex = /\r\n|\n\r|\n|\r|\s+/g;

  const matches = formPostRegex.exec(formData);
  if (matches && matches.length >= 1) {
    const responseJwt = matches[1];
    if (responseJwt) {
      const jwt = responseJwt.replace(lineExpressionRegex, "");
      const decodedJwt = await decodeJwt(jwt);
      return { jwt, decodedJwt };
    }
  }

  throw new ValidationFailed(
    `Unable to obtain JWT from form_post.jwt. Form data: ${formData}`
  );
};
