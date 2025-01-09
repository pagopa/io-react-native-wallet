import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../errors";

describe("ResponseErrorBuilder", () => {
  const errorBuilderWithFallback = new ResponseErrorBuilder(IssuerResponseError)
    .handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "A message",
    })
    .handle(409, {
      code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
      message: "Another message",
      reason: "A custom reason",
    })
    .handle("*", {
      code: IssuerResponseErrorCodes.IssuerGenericError,
      message: "Fallback error case",
    });

  test.each([
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 403,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialInvalidStatus,
        message: "A message",
        reason: "base reason",
        statusCode: 403,
      }),
    },
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 409,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
        message: "Another message",
        reason: "A custom reason",
        statusCode: 409,
      }),
    },
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 500,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.IssuerGenericError,
        message: "Fallback error case",
        reason: "base reason",
        statusCode: 500,
      }),
    },
  ])(
    "should create the correct error for status code $original.statusCode",
    ({ original, target }) => {
      const error = errorBuilderWithFallback.buildFrom(original);
      expect(error.code).toEqual(target.code);
      expect(error.message).toEqual(target.message);
      expect(error.reason).toEqual(target.reason);
      expect(error.statusCode).toEqual(target.statusCode);
    }
  );

  it("should return the original error when nothing matches", () => {
    const errorBuilderWithoutFallback = new ResponseErrorBuilder(
      IssuerResponseError
    ).handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "A message",
    });

    const original = new UnexpectedStatusCodeError({
      message: "base message",
      reason: "base reason",
      statusCode: 500,
    });

    const error = errorBuilderWithoutFallback.buildFrom(original);
    expect(error).toEqual(original);
  });
});
