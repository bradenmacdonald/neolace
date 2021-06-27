import { Schema, string, boolean, unknown, Type } from "https://denoporter.sirjosh.workers.dev/v1/deno.land/x/computed_types@v1.9.0/src/index.ts";

// deno-lint-ignore no-explicit-any
type Validator<T> = (value: any) => T;

export {
    Schema,
    string,
    boolean,
    unknown,
}
export type {
    Type,
    Validator,
}

const nullable = <T>(validator: T) => Schema.either(unknown.equals(null), validator);


// Most string types have the following validation:
const normalString = string.trim().max(1_000);



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
