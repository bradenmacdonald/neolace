import { Schema, string, boolean, number, unknown, Type, array, object, DateType } from "./deps/computed-types.ts";
import { VNID } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Validator<T> = (value: any) => T;

export {
    Schema,
    string,
    boolean,
    number,
    unknown,
    array,
    object,
    DateType,
}
export type {
    Type,
    Validator,
}

export const nullable = <T>(validator: T) => Schema.either(unknown.equals(null), validator);

export const vnidString = string.regexp(/^_[0-9A-Za-z]{1,22}$/).transform(x => x as VNID);

// Most string types have the following validation:
export const normalString = string.trim().max(1_000);

// TODO: move these to "User" file/namespace

export const CreateHumanUser = Schema({
    email: normalString,
    fullName: normalString.strictOptional(),
    username: normalString.strictOptional(),
});

export const UserDataResponse = Schema.either(
    {
        isBot: boolean.equals(false),
        username: normalString,
        fullName: nullable(normalString),
    },
    {
        isBot: boolean.equals(true),
        ownedByUsername: string,
        username: normalString,
        fullName: nullable(normalString),
    }
);
