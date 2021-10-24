import { group, test, assertEquals } from "neolace/lib/tests.ts";
import { getFullPath } from "neolace/sample-data/technotes/datafiles.ts";
import { files } from "../../sample-data/technotes/datafiles.ts";
import { readAll } from "std/io/util.ts";
import { detectImageMetadata } from "./detect-metadata.ts";


async function readFileData(path: string): Promise<Uint8Array> {
    const file = await Deno.open(path, {read: true});
    const data = await readAll(file);
    file.close();
    return data;
}


group(import.meta, () => {

    test("it can detect an image's size", async () => {
        const imageDataWebp = await readFileData(getFullPath(files.miniCooperSe.path));
        const metadata = detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.width, 4054);
        assertEquals(metadata.height, 2216);
    });
    test("it can generate a blurHash for an image", async () => {
        const imageDataWebp = await readFileData(getFullPath(files.miniCooperSe.path));
        const metadata = detectImageMetadata(imageDataWebp);
        assertEquals(metadata.type, "image");
        assertEquals(metadata.blurHash, "LKF={%xuoft7~qxuofRjIUWBxuIU");
    });
});
