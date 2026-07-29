import type { ParsedStatusAssertion } from "../api/types";
import type { ParsedStatusAssertionJwt } from "./types";

import { createMapper } from "../../../utils/mappers";

export const mapToParsedStatusAssertion = createMapper<
  ParsedStatusAssertionJwt,
  ParsedStatusAssertion
>((x) => x.payload);
