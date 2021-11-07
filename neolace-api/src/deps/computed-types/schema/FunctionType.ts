// deno-lint-ignore-file no-explicit-any
// imports rewritten with <3 from denoporter - https://github.com/SirJosh3917/denoporter

export type FunctionParameters = unknown[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FunctionType<R = any, P extends FunctionParameters = any[]> = (...args: P) => R;
export default FunctionType;
