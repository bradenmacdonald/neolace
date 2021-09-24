// To make this bundle node-compatible, including TypeScript definitions, we include our own copy downloaded from this URL:
//export * from "https://denoporter.sirjosh.workers.dev/v1/deno.land/x/computed_types@v1.9.0/src/index.ts";
export * from "./computed-types/index.ts";

// But we make one patch to fix the Type<> helper so that it can properly treat optional object keys as optional?
// In computed-types/schema/io.ts on line 24 in SchemaResolveType<S> we change
//     [K in keyof S]
// to
//     [K in keyof SchemaKeysObject<S>]
