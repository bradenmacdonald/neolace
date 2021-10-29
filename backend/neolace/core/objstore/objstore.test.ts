import { group, test, assertEquals } from "neolace/lib/tests.ts";
import { getFullPath } from "neolace/sample-data/technotes/datafiles.ts";
import { files } from "../../sample-data/technotes/datafiles.ts";
import { uploadFileToObjStore } from "./objstore.ts";


group(import.meta, () => {

    test("it can upload an image file into object storage", async () => {
        const imageDataWebp = await Deno.open(getFullPath(files.miniCooperSe.path));
        const uploadResult = await uploadFileToObjStore(imageDataWebp, {contentType: "image/webp"});
        imageDataWebp.close();
        assertEquals(uploadResult.size, 439352);
        assertEquals(uploadResult.sha256Hash, "552b46ae2c456ee5c76c2ab0e092b0bc4fde36c984b030ad887adaf57c513fdb");
    });
});
