import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";

const outDir = "./dist";

await emptyDir(outDir);

await build({
    entryPoints: ["./src/index.ts"],
    outDir,
    test: false,
    // Emit ES6 style output, not CommonJS nor UMD
    scriptModule: false,
    shims: {
    },
    compilerOptions: {
        lib: ["dom","dom.iterable","es2021"],
    },
    package: {
        // package.json properties
        name: "neolace-api",
        version: "0.0.0",
        description: "Neolace API Client, type definitions, and Markdown library.",
        license: "MIT",
    },
});
await emptyDir(`${outDir}/src`);
await Deno.remove(`${outDir}/src`);
