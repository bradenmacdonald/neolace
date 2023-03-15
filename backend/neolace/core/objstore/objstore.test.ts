/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, group, test } from "neolace/lib/tests.ts";
import { files, getFullPath } from "neolace/sample-data/plantdb/datafiles.ts";
import { uploadFileToObjStore } from "./objstore.ts";

group("objstore.ts", () => {
    test("it can upload an image file into object storage", async () => {
        const imageDataWebp = await Deno.open(getFullPath(files.ponderosaPineImg.path));
        const uploadResult = await uploadFileToObjStore(imageDataWebp, { contentType: "image/webp" });
        imageDataWebp.close();
        assertEquals(uploadResult.size, 1581898);
        assertEquals(uploadResult.sha256Hash, "e0b56bc58b5b4ac8b6f9a3e0fc5083d4c7f447738ef39241377687d6bfcef0e6");
    });
});
