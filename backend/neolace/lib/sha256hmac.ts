/**
 * @author MacDonald Thoughtstuff Inc.
 * @license Unlicense (see https://unlicense.org/ - public domain, use as you will, but no warranty of any kind)
 */

/**
 * Given a secret key and some data, generate a HMAC of the data using SHA-256.
 */
export async function sha256hmac(
    secretKey: Uint8Array | string,
    data: Uint8Array | string,
): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const keyObject = await crypto.subtle.importKey(
        "raw", // raw format of the key - should be Uint8Array
        secretKey instanceof Uint8Array ? secretKey : enc.encode(secretKey),
        { name: "HMAC", hash: { name: "SHA-256" } }, // algorithm
        false, // export = false
        ["sign", "verify"], // what this key can do
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        keyObject,
        data instanceof Uint8Array ? data : enc.encode(data),
    );
    return new Uint8Array(signature);
}
