import { enum_, parse } from "remix/data-schema";

export function parseStoredEnumUnvalidatedByColumnType<
  const Values extends readonly [string, ...string[]],
>(values: Values, stored: string): Values[number] {
  return parse(enum_(values), stored);
}
