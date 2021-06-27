declare type NominalType<T, K extends string> = T & {nominal: K;};  // Nominal type, compatible with Vertex Framework
export declare type VNID = NominalType<string, "VNID">;  // Same definition as in Vertex Framework
