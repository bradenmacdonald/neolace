import { assertEquals, group, test } from "neolace/lib/tests.ts";
import { files, getFullPath } from "neolace/sample-data/plantdb/datafiles.ts";
import { detectImageMetadata } from "./detect-metadata.ts";

group(import.meta, () => {
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
});
