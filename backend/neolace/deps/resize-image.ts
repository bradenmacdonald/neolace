// Resize an image in memory.
// Adapted from https://github.com/MariusVatasoiu/deno-image (MIT licensed)

// We need this in order to speed up the blurhash algorithm, which is extremely slow to use on large images.

import { Resize } from "https://deno.land/x/deno_image@v0.0.3/lib/resize/resize.js";

/**
 * Resize an image, which has already been decoded in memory as an RGB or RGBA array (doesn't matter)
 * @param imgData - Raw pixel data of the image
 * @param options - options for resize
 */
export function resizeImagePixels(
    imagePixels: Uint8Array,
    options: { originalWidth: number; originalHeight: number; newMaxWidth: number; newMaxHeight: number },
): Promise<{
    pixels: Uint8Array;
    width: number;
    height: number;
}> {
    const { newWidth, newHeight } = getDimensions(options);

    return new Promise((resolve) => {
        const resized = new Resize(
            options.originalWidth,
            options.originalHeight,
            newWidth,
            newHeight,
            true,
            true,
            false,
            (newPixels: Uint8Array) => {
                resolve({
                    pixels: newPixels,
                    width: newWidth,
                    height: newHeight,
                });
            },
        );

        resized.resize(imagePixels);
    });
}

/**
 * Get dimensions for resizing an image
 * @param options - options for resize
 * - for landscape, width has priority
 * - for portrait, height has priority
 */
function getDimensions(
    options: { originalWidth: number; originalHeight: number; newMaxWidth?: number; newMaxHeight?: number },
): { newWidth: number; newHeight: number } {
    const {
        originalWidth,
        originalHeight,
        newMaxWidth,
        newMaxHeight,
    } = options || {};

    // Keep aspect ratio
    const _aspectRatio = originalWidth / originalHeight;
    let newWidth;
    let newHeight;

    if (_aspectRatio > 1) { // landscape
        if (newMaxWidth) {
            newWidth = newMaxWidth;
            newHeight = Math.trunc(newMaxWidth / _aspectRatio);
        } else if (!newMaxWidth && newMaxHeight) {
            newWidth = Math.trunc(newMaxHeight * _aspectRatio);
            newHeight = newMaxHeight;
        } else {
            newWidth = 100;
            newHeight = Math.trunc(100 / _aspectRatio);
        }
    } else { //portrait
        if (newMaxHeight) {
            newWidth = Math.trunc(newMaxHeight * _aspectRatio);
            newHeight = newMaxHeight;
        } else if (newMaxWidth && !newMaxHeight) {
            newWidth = newMaxWidth;
            newHeight = Math.trunc(newMaxWidth / _aspectRatio);
        } else {
            newWidth = Math.trunc(100 * _aspectRatio);
            newHeight = 100;
        }
    }

    return { newWidth, newHeight };
}
