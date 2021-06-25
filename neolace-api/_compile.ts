import { ensureDir } from "https://deno.land/std@0.99.0/fs/mod.ts";
import { dirname } from "https://deno.land/std@0.99.0/path/mod.ts";

const distDir = "dist/";

for await (const existingFile of Deno.readDir(distDir)) {
    await Deno.remove(`${distDir}${existingFile.name}`, {recursive: true});
}

const srcDir = "src";
const {files} = await Deno.emit(`${srcDir}/index.ts`, {
    compilerOptions: {
        declaration: true,
    },
});

for (const _path in files) {
    if (!_path.endsWith(".d.ts")) {
        continue;
    }
    // Write out any .d.ts files:
    const idx = _path.lastIndexOf(`/${srcDir}/`);
    if (idx === -1) {
        throw new Error("Internal error, path mismatch");
    }
    const newPath = distDir + _path.substr(idx+srcDir.length+2);
    await ensureDir(dirname(newPath));  // Make sure any required subfolders exist
    await Deno.writeTextFile(newPath, files[_path]);
}

// Now emit a single bundle:
const bundleResult = await Deno.emit(`${srcDir}/index.ts`, {
    bundle: "module",
    check: false,  // Already checked, above.
});

const bundleFile = bundleResult.files[Object.keys(bundleResult.files)[0]];
await Deno.writeTextFile(`${distDir}neolace-api-bundle.js`, bundleFile);
