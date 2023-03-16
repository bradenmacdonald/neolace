/**
 * @file Dependencies for the Neolace admin script.
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
export * as SDK from "../neolace-sdk/src/index.ts";
export { VNID } from "../neolace-sdk/src/index.ts";

// Parts of the std library that we use:
import { getLogger, setup, handlers } from "https://deno.land/std@0.175.0/log/mod.ts";
export { parse as parseYaml, stringify as stringifyYaml } from "https://deno.land/std@0.175.0/encoding/yaml.ts";
export { readAll } from "https://deno.land/std@0.175.0/streams/read_all.ts";
export { assertEquals } from "https://deno.land/std@0.175.0/testing/asserts.ts";
export { getApiClientFromEnv } from "../neolace-sdk/utils/cli-client.ts";

// Logging:
const moduleName = "neolace-admin";
const fmtObj = typeof Deno?.inspect === "function" ? Deno.inspect : JSON.stringify;
const fmt = (msg: unknown) => typeof msg === "string" ? msg : fmtObj(msg);
export const log = {
    warning(...args: unknown[]) {
        getLogger(moduleName).warning(() => args.map((a) => fmt(a)).join(" "));
    },
    debug(...args: unknown[]) {
        getLogger(moduleName).debug(() => args.map((a) => fmt(a)).join(" "));
    },
    info(...args: unknown[]) {
        getLogger(moduleName).info(() => args.map((a) => fmt(a)).join(" "));
    },
    error(...args: unknown[]) {
        getLogger(moduleName).error(() => args.map((a) => fmt(a)).join(" "));
    },
    critical(...args: unknown[]) {
        getLogger(moduleName).critical(() => args.map((a) => fmt(a)).join(" "));
    },
    setup,
    handlers,
};
