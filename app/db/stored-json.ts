import { array, parse, string } from "remix/data-schema";

export function parseStoredStringArrayUnvalidatedByColumnType(stored: string[]): string[] {
  return parse(array(string()), stored);
}
