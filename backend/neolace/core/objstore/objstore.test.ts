import { group, test, assertEquals } from "neolace/lib/tests.ts";
import { getFullPath, files } from "neolace/sample-data/plantdb/datafiles.ts";
import { uploadFileToObjStore } from "./objstore.ts";


group(import.meta, () => {

    test("it can upload an image file into object storage", async () => {
        const imageDataWebp = await Deno.open(getFullPath(files.ponderosaPineImg.path));
        const uploadResult = await uploadFileToObjStore(imageDataWebp, {contentType: "image/webp"});
        imageDataWebp.close();
        assertEquals(uploadResult.size, 1581898);
        assertEquals(uploadResult.sha256Hash, "e0b56bc58b5b4ac8b6f9a3e0fc5083d4c7f447738ef39241377687d6bfcef0e6");
    });
});
