declare type NominalType<T, K extends string> = T & {nominal: K;};  // Nominal type, compatible with Vertex Framework
export declare type VNID = NominalType<string, "VNID">;  // Same definition as in Vertex Framework

export * from "https://denoporter.sirjosh.workers.dev/v1/deno.land/x/computed_types@v1.9.0/src/index.ts";
