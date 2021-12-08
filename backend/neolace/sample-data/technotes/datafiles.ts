import { EmptyResultError, VNID, } from "neolace/deps/vertex-framework.ts";
import { uploadFileToObjStore } from "neolace/core/objstore/objstore.ts";
import { join as joinPath, dirname } from "std/path/mod.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";

const thisFolder: string = (() => {
    const tf = dirname(import.meta.url);
    return tf.startsWith("file:") ? tf.substr(5) : tf;
})();


export const files = Object.freeze({
    miniCooperSe: {id: VNID("_2dWW6omMxcycUL9pgKpNzY"), path: "images/martin-katler-a_Fy7a4KO6g-unsplash.webp"},
    liIonBatteryJellyRoll: {id: VNID("_L0CTn3l4wywprxeu8JwO9"), path: "images/li-ion-cell-jelly-roll.webp"},
    cell18650sparkfun: {id: VNID("_Ti9O7i7a3KibJWbQSiW6P"), path: "images/sparkfun-18650.webp"},
    aaBattery: {id: VNID("_6tT4Jw1MVwN2kBEA5lVKz0"), path: "images/energizer-aa.webp"},
    teamBraden: {id: VNID("_54kqEz80XKazlagzNU3kgd"), path: "images/team-braden.jpg"},
    teamJoel: {id: VNID("_1MFuZbHV6rFD9OcfzCwzdG"), path: "images/team-joel.jpg"},
    teamJeff: {id: VNID("_2DGa0G8dw8KZye6AHDtQmT"), path: "images/team-jeff.jpg"},
    homeLogoNRC: {id: VNID("_2BLaIEv3OIpNqnaY2Bgup9"), path: "images/nrc-logo.png"},
    homeLogoSandbox: {id: VNID("_lCylFGMj67elCMvvmsRVJ"), path: "images/mit-sandbox-logo.png"},
    homeLogoILab: {id: VNID("_6nT9EiaXulRVSQhSev19B5"), path: "images/harvard-innovation-labs-logo.png"},
    // spare: {id: VNID("_ri1ZXkgEhPLfOQc1OpePH"), path: ""},
    // spare: {id: VNID("_6YqLTa9UnnUXIHn5M8FWo4"), path: ""},
    // spare: {id: VNID("_63b0ourIXePUej3d5bcPvl"), path: ""},
    // spare: {id: VNID("_4dT5ZB53PE0XNywEnvTgMf"), path: ""},
});

export function getFullPath(path: string) {
    return joinPath(thisFolder, path);
}

export async function ensureFilesExist() {

    for (const f of Object.values(files)) {
        try {
            await graph.pullOne(DataFile, df => df.id, {key: f.id});
            continue;  // This file already exists.
        } catch (err) {
            if (err instanceof EmptyResultError) {
                // do nothing, we need to upload this file now
            } else { throw err; }
        }

        // We need to upload this file:
        const fullPath = getFullPath(f.path);
        let contentType: string;
        if (f.path.endsWith(".webp")) {
            contentType = "image/webp";
        } else if (f.path.endsWith(".svg")) {
            contentType = "image/svg+xml";
        } else if (f.path.endsWith(".jpg")) {
            contentType = "image/jpeg";
        } else if (f.path.endsWith(".png")) {
            contentType = "image/png";
        } else {
            throw new Error(`Couldn't detect content type of sample file "${f.path}".`)
        }
        const file = await Deno.open(fullPath);
        const uploadData = await uploadFileToObjStore(file, {contentType, id: f.id});
        file.close();
    
        await graph.runAsSystem(CreateDataFile({
            ...uploadData,
            contentType,
        }));
    }

}
