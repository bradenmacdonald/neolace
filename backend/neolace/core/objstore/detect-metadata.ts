import { decodeImage } from "neolace/deps/wasm-image-decoder.ts";
import { encode as encodeBlurHash } from "neolace/deps/blurhash.ts";

export interface ImageMetadata {
    type: "image",
    width: number,
    height: number,
    blurHash: string;
}
export type FileMetadata = Record<string, never>|ImageMetadata;


/**
 * Given the encoded binary data of an image (e.g. a JPEG file), detect some metadata about it.
 * @param buffer 
 */
export function detectImageMetadata(encodedImageData: Uint8Array): ImageMetadata {
    console.time("decodeImage");
    const imageData = decodeImage(encodedImageData.buffer);
    console.timeEnd("decodeImage");
    console.time("encodeBlurHash");
    const blurHash = encodeBlurHash(new Uint8ClampedArray(imageData.data.buffer), imageData.width, imageData.height, 4, 3);
    console.timeEnd("encodeBlurHash");
    return {
        type: "image",
        width: imageData.width,
        height: imageData.height,
        // A blurHash is a a short string that allows clients to render a blurry placeholder for the image.
        // See https://blurha.sh/ . We use a blurhash with 4x3 components.
        blurHash,
    };
}

