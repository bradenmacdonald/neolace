/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { decodeImage } from "neolace/deps/wasm-image-decoder.ts";
import { encode as encodeBlurHash } from "neolace/deps/blurhash.ts";
import { resizeImagePixels } from "neolace/deps/resize-image.ts";
import { number, Schema, string, Type } from "neolace/deps/computed-types.ts";

export const ImageMetadataSchema = Schema({
    type: "image",
    width: number,
    height: number,
    blurHash: string,
    /** Border color as an RGBA 32-bit integer */
    borderColor: number.strictOptional(),
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
    const blurHash = encodeBlurHash(
        new Uint8ClampedArray(smallImageData.pixels.buffer),
        smallImageData.width,
        smallImageData.height,
        4,
        3,
    );
    const borderColor = detectBorderColor(imageData.data, imageData.width, imageData.height);
    return {
        type: "image",
        width: imageData.width,
        height: imageData.height,
        // A blurHash is a a short string that allows clients to render a blurry placeholder for the image.
        // See https://blurha.sh/ . We use a blurhash with 4x3 components.
        blurHash,
        borderColor,
    };
}

/**
 * Detect if all of the outer pixels of the image are the same color, and if so return that color as a 32-bit RGBA value
 * @param rgbaData Decoded image pixels, as an array of 32-bit RGBA values
 * @param width Width of the image in pixels
 * @param height Height of the image in pixels
 * @returns
 */
function detectBorderColor(rgbaData: Uint8Array, width: number, height: number): number | undefined {
    // Convert the array to a 32-bit view of the array so we can easily compare one pixel at a time instead of one byte at a time.
    const array32 = new Uint32Array(rgbaData.buffer);
    const firstColor = array32[0];
    // Scan along the top row:
    for (let x = 0, y = 0; x < width; x++) {
        if (array32[x + width * y] !== firstColor) {
            return undefined;
        }
    }
    // Scan along the left side:
    for (let x = 0, y = 0; y < height; y++) {
        if (array32[x + width * y] !== firstColor) {
            return undefined;
        }
    }
    // Scan along the right side:
    for (let x = width - 1, y = 0; y < height; y++) {
        if (array32[x + width * y] !== firstColor) {
            return undefined;
        }
    }
    // Scan along the bottom row:
    for (let x = height - 1, y = 0; x < width; x++) {
        if (array32[x + width * y] !== firstColor) {
            return undefined;
        }
    }
    return firstColor;
}
