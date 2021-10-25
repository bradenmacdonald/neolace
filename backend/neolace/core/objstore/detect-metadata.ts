import { decodeImage } from "neolace/deps/wasm-image-decoder.ts";
import { encode as encodeBlurHash } from "neolace/deps/blurhash.ts";
import { resizeImagePixels } from "neolace/deps/resize-image.ts";
import { number, Schema, Type, string } from "neolace/deps/computed-types.ts";


export const ImageMetadataSchema = Schema({
    type: "image",
    width: number,
    height: number,
    blurHash: string,
});
export type ImageMetadata = Type<typeof ImageMetadataSchema>;

export const FileMetadataSchema = Schema.either(ImageMetadataSchema, Schema({}));
export type FileMetadata = Type<typeof FileMetadataSchema>;


/**
 * Given the encoded binary data of an image (e.g. a JPEG file), detect some metadata about it.
 * @param buffer 
 */
export async function detectImageMetadata(encodedImageData: Uint8Array): Promise<ImageMetadata> {
    const imageData = decodeImage(encodedImageData.buffer);
    // Computing the blurhash is extremely slow unless we first resize the image.
    const smallImageData = await resizeImagePixels(imageData.data, {
        originalWidth: imageData.width,
        originalHeight: imageData.height,
        newMaxWidth: 20,
        newMaxHeight: 20,
    });
    const blurHash = encodeBlurHash(new Uint8ClampedArray(smallImageData.pixels.buffer), smallImageData.width, smallImageData.height, 4, 3);
    return {
        type: "image",
        width: imageData.width,
        height: imageData.height,
        // A blurHash is a a short string that allows clients to render a blurry placeholder for the image.
        // See https://blurha.sh/ . We use a blurhash with 4x3 components.
        blurHash,
    };
}

