/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { EmptyResultError, VNID } from "neolace/deps/vertex-framework.ts";
import { uploadFileToObjStore } from "neolace/core/objstore/objstore.ts";
import { dirname, fromFileUrl, join as joinPath } from "std/path/mod.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";

const thisFolder: string = dirname(fromFileUrl(import.meta.url));

export const files = Object.freeze({
    ponderosaPineImg: { id: VNID("_buzaxyrAoq6yEFvu0zX2J"), path: "images/img-lassen-ponderosa.webp" },
    leafOnWhite: { id: VNID("_69fvlItXM0uyIvfnmolVqB"), path: "images/leaf-on-white.png" },
});

export function getFullPath(path: string) {
    return joinPath(thisFolder, path);
}

export async function ensureFilesExist() {
    const graph = await getGraph();
    for (const f of Object.values(files)) {
        try {
            await graph.pullOne(DataFile, (df) => df.id, { key: f.id });
            continue; // This file already exists.
        } catch (err) {
            if (err instanceof EmptyResultError) {
                // do nothing, we need to upload this file now
            } else throw err;
        }

        // We need to upload this file:
        const fullPath = getFullPath(f.path);
        let contentType: string;
        if (f.path.endsWith(".webp")) {
            contentType = "image/webp";
        } else if (f.path.endsWith(".svg")) {
            contentType = "image/svg+xml";
        } else if (f.path.endsWith(".png")) {
            contentType = "image/png";
        } else {
            throw new Error(`Couldn't detect content type of sample file "${f.path}".`);
        }
        const file = await Deno.open(fullPath);
        const uploadData = await uploadFileToObjStore(file, { contentType, id: f.id });
        file.close();

        await graph.runAsSystem(CreateDataFile({
            ...uploadData,
            contentType,
        }));
    }
}
