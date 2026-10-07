import {
  array,
  boolean,
  literal,
  object,
  optional,
  record,
  string,
  variant,
  type InferOutput,
} from "remix/data-schema";

export const EDITOR_RESPONSE_MEDIA_TYPE = "application/vnd.drinks.editor+json";

// This contract belongs to the Drink editor web seam, not the transport-independent Drinks module.
export const drinkEditorResponseSchema = variant("kind", {
  invalid: object({
    kind: literal("invalid"),
    fieldErrors: record(string(), optional(array(string()))),
    formErrors: array(string()),
  }),
  notFound: object({ kind: literal("notFound"), message: string() }),
  navigate: object({ kind: literal("navigate"), location: string(), document: boolean() }),
});

export type DrinkEditorResponse = InferOutput<typeof drinkEditorResponseSchema>;
