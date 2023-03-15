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
import { detectImageMetadata } from "./detect-metadata.ts";

group("detect-metadata.ts", () => {
    test("it can detect an image's size", async () => {
        const imageDataWebp = await Deno.readFile(getFullPath(files.ponderosaPineImg.path));
        const metadata = await detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.width, 3504);
        assertEquals(metadata.height, 2336);
    });
    test("it can generate a blurHash for an image", async () => {
        const imageDataWebp = await Deno.readFile(getFullPath(files.ponderosaPineImg.path));
        const metadata = await detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.blurHash, "LCDu}B~VNu9Z0LxGNH9u$zjYWCt7");
    });
    test("it can detect the border color of an an image", async () => {
        // This image has different colors of pixels along its border
        const metadata1 = await detectImageMetadata(await Deno.readFile(getFullPath(files.ponderosaPineImg.path)));
        assertEquals(metadata1.type, "image");
        assertEquals(metadata1.borderColor, undefined);
        // This image has white pixels all the way around:
        const metadata2 = await detectImageMetadata(await Deno.readFile(getFullPath(files.leafOnWhite.path)));
        assertEquals(metadata2.type, "image");
        assertEquals(metadata2.borderColor, 0xffffffff);
    });
});
