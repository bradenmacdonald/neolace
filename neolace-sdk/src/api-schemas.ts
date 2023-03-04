import { array, boolean, DateType, number, object, Schema, string, Type, unknown } from "./deps/computed-types.ts";
import { VNID } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Validator<T> = (value: any) => T;

export { array, boolean, DateType, number, object, Schema, string, unknown };
export type { Type, Validator };

export const nullable = <T>(validator: T) => Schema.either(unknown.equals(null), validator);

export const vnidString = string.regexp(/^_[0-9A-Za-z]{1,22}$/).transform((x) => x as VNID);

// Until computed_types supports a Record type, we have our own. See https://github.com/neuledge/computed-types/issues/43
export const Record = <KeyType extends string | number | symbol, ValueType>(
    keySchema: Validator<KeyType>,
    valueSchema: Validator<ValueType>,
) => {
    return (object
        .test((obj) => Object.values(obj).every(valueSchema) && Object.keys(obj).every(keySchema))
        .transform((obj) => obj as Record<KeyType, ValueType>));
};

// Most string types have the following validation:
export const normalString = string.trim().max(1_000);

export const HealthCheckResponse = Schema({
    reachable: boolean,
    databaseWorking: boolean,
});

/**
 * A paginated result set.
 */
export const PaginatedResult = <T>(itemSchema: Validator<T>) =>
    Schema({
        values: array.of(itemSchema),
        totalCount: number,
    });
export type PaginatedResultData<T> = { values: T[]; totalCount: number };

/**
 * A paginated result set that can be used like an iterator to fetch a list of things in order, but which does not
 * support random access (jumping ahead to a specific page).
 */
export const StreamedResult = <T>(itemSchema: Validator<T>) =>
    Schema({
        values: array.of(itemSchema),
        totalCount: number.strictOptional(),
        nextPageUrl: string.strictOptional(),
    });
export type StreamedResultData<T> = { values: T[]; totalCount?: number; nextPageUrl?: string };
