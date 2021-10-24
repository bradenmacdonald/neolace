import { decode } from "./blurhash";

/**
 * Given a blurHash string (see https://blurha.sh/), return the props that the Next.js <Image> React
 * component needs to render a placeholder.
 * 
 * Specifically, we need to convert the blurHash to a data: image URL.
 */
export function blurHashProps(blurHash: string, realWidth: number, realHeight: number): {placeholder?: "blur", blurDataURL?: string} {

    const width = 200;
    const height = Math.round((realHeight / realWidth) * width);

    if (typeof document === "undefined") {
        return {};
    }
    const blurHashData = decode(blurHash, width, height);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    const imgData = ctx.createImageData(width, height);
    imgData.data.set(blurHashData);
    ctx.putImageData(imgData, 0, 0);

    return {
        placeholder: "blur",
        blurDataURL: canvas.toDataURL()
    };
}
