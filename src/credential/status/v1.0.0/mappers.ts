import { createMapper } from "../../../utils/mappers";
import type { ParsedStatusAssertion } from "../api/types";
import type { ParsedStatusAssertionJwt } from "./types";

export const mapToParsedStatusAssertion = createMapper<
  ParsedStatusAssertionJwt,
  ParsedStatusAssertion
>((x) => x.payload);
