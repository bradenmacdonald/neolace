import { group, test, assertEquals } from "neolace/lib/tests.ts";
import { getFullPath } from "neolace/sample-data/technotes/datafiles.ts";
import { files } from "../../sample-data/technotes/datafiles.ts";
import { detectImageMetadata } from "./detect-metadata.ts";


group(import.meta, () => {

    test("it can detect an image's size", async () => {
        const imageDataWebp = await Deno.readFile(getFullPath(files.miniCooperSe.path));
        const metadata = await detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.width, 4054);
        assertEquals(metadata.height, 2216);
    });
    test("it can generate a blurHash for an image", async () => {
        const imageDataWebp = await Deno.readFile(getFullPath(files.miniCooperSe.path));
        const metadata = await detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.blurHash, "LWF=:f%2xaxu~qxts:floLj?xbM{");
    });
});
