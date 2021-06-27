import { Schema, string } from "./types.ts";


// Most string types have the following validation:
const normalString = string.trim().max(1_000);



export const CreateHumanUser = Schema({
    email: normalString,
    fullName: normalString.strictOptional(),
    username: normalString.strictOptional(),
});
