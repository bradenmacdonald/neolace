import { Schema, Type, vnidString } from "../api-schemas.ts";
import { LookupValueSchema } from "./lookup-value.ts";
import { ReferenceCacheSchema } from "./reference-cache.ts";
/**
 * Response returned when the "evaluate lookup expression" API endpoint is used to run a lookup on the knowledge base.
 */
 export const EvaluateLookupSchema = Schema({
    /** The ID of the entry that was used as the context ("this") when evaluating the expression, if any. */
    entryContext: vnidString.strictOptional(),
    resultValue: LookupValueSchema,
    /** Details useful to display values in the frontend */
    referenceCache: ReferenceCacheSchema,
});

export type EvaluateLookupData = Type<typeof EvaluateLookupSchema>;
