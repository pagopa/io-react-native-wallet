import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { ValidationFailed } from "./errors";
import type { JWTDecodeResult } from "../sd-jwt/types";

/*
 * Decode a form_post.jwt and return the final JWT.
 * The formData here is in form_post.jwt format as defined in
 * JWT Secured Authorization Response Mode for OAuth 2.0 (JARM)
 <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8" />
        </head>
        <body onload="document.forms[0].submit()">
        <noscript>
            <p>
                <strong>Note:</strong> Since your browser does not support JavaScript, you must press the Continue button once to proceed.
            </p>
        </noscript>
            <form action="iowalletexample//cb" method="post">       
                <div>
                    <input type="hidden" name="response" value="somevalue" />
                </div>
                <noscript>
                    <div>
                        <input type="submit" value="Continue" />
                    </div>
                </noscript>
            </form>
        </body>
    </html>
 */
export const getJwtFromFormPost = async (
  formData: string
): Promise<{ jwt: string; decodedJwt: JWTDecodeResult }> => {
  const formPostRegex = /<input[^>]*name="response"[^>]*value="([^"]*)"/i;
  const lineExpressionRegex = /\r\n|\n\r|\n|\r|\s+/g;

  const match = formPostRegex.exec(formData);
  if (match && match[1]) {
    const responseJwt = match[1];

    if (responseJwt) {
      const jwt = responseJwt.replace(lineExpressionRegex, "");
      const decodedJwt = decodeJwt(jwt);
      return { jwt, decodedJwt };
    }
  }

  throw new ValidationFailed({
    message: `Unable to obtain JWT from form_post.jwt. Form data: ${formData}`,
  });
};
