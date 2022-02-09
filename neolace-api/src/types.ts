/** VNID type from Vertex Framework, required for generating IDs */

// export { VNID, isVNID } from "https://raw.githubusercontent.com/neolace-dev/vertex-framework/8551a3ed9c6f3f09d9a44df4a6ff052aa0150b95/vertex/lib/types/vnid.ts";

// Our code for compiling to Node.js doesn't support HTTP imports ^ so we have copied the code below. It's very stable
// anyways.


/**
 * A simple TypeScript UUIDv4 implementation for Deno
 *
 * Can parse any UUID version, including the nil UUID, but only generates new v4 UUIDs.
 *
 * This class is memory-efficient and stores its value as a Uint8Array. For general
 * purpose use and interopability, you probably want to use the UUID() function below
 * instead.
 */
class UUIDv4 {
    /** The internal UUID value (16 bytes, 128 bits) */
    private _value: Uint8Array;
    static readonly VERSION = 4;
    static readonly VARIANT = 0b10; // Two bits to specify "Variant 1", a standard UUID

    constructor(stringValue?: string) {
        this._value = new Uint8Array(16);
        if (stringValue !== undefined) {
            const hexDigits = stringValue.replace(/-/g, "");
            if (hexDigits.length !== 32) {
                throw new Error(`Invalid UUID string "${stringValue}"`);
            }
            for (let i = 0; i < 16; i++) {
                // Parsing each digit separately gives more robust error handling; otherwise errors in second digit get ignored.
                const value = parseInt(hexDigits.charAt(i * 2), 16) * 16 + parseInt(hexDigits.charAt(i * 2 + 1), 16);
                if (isNaN(value)) { throw new Error(`Invalid UUID string "${stringValue}"`); }
                // We need to check NaN before storing into this._value, or NaN gets silently converted to 0
                this._value[i] = value;
            }
        } else {
            // Generate a new random UUIDv4:
            crypto.getRandomValues(this._value);
            this._value[6] = (this._value[6] & 0x0f) | (UUIDv4.VERSION<<4);
            this._value[8] = (this._value[8] & 0xbf) | (UUIDv4.VARIANT<<6);
        }
    }

    /**
     * Custom JSON serialization
     */
    public toJSON(): string { return this.toString(); }

    /**
     * Get the primitive value (enables correct sorting)
     * Except note that equality checking won't work.
     */
    public valueOf(): string { return this.toString(); }

    /** 
     * Get this UUID as a BigInt
     */
    public toBigInt(): bigint {
        return BigInt(this._value.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "0x"));
    }
}

type NominalType<T, K extends string> = T & { nominal: K };

/** A VNID-string, which is kind of like a subclass of string */
export type VNID = NominalType<string, "VNID">;

/**
 * Generate a new VNID string, or validate a VNID string
 */
export function VNID(encodedString?: string): VNID {
    if (encodedString === undefined) {
        // Generate a new VNID.
        return encodeVNID(new UUIDv4())
    } else {
        // Validate that an arbitrary string is a VNID (type safety check)
        decodeVNID(encodedString as VNID); // This will raise an exception if the value is not a valid VNID
        return encodedString as VNID;
    }
}

/** Is the given value a VNID string? */
export function isVNID(value: unknown): value is VNID {
    try {
        decodeVNID(value as VNID);  // It is safe to pass non-strings to this function
        return true;
    } catch {
        return false;
    }
}

/** Helper function: encode a UUID into VNID format (base 62 with underscore prefix) */
function encodeVNID(value: UUIDv4): VNID {
    return "_" + toBase62(value.toBigInt()) as VNID;
}


// Character set for VNIDs - this is base62, in ASCII sort order
const vnidCharset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const base = 62n;

/** Helper function: encode a number in base 62 */
function toBase62(number: bigint): string {
    if (number == 0n) {
        return "0";
    } else if (number < 0n) {
        throw new Error("Cannot convert negative numbers to base 62");
    }
    let encoded = "";
    while (number > 0n) {
        const remainder = Number(number % base);
        number /= base;
        encoded = vnidCharset.charAt(remainder) + encoded;
    }
    return encoded;
}

/**
 * Given a VNID string (base 62 encoded UUID with "_" prefix), decode it to a UUID.
 * 
 * Use decodeVNID(VNID(foo)) to parse a string value; do not use decodeVNID(foo as VNID)
 */
function decodeVNID(value: VNID): UUIDv4 {
    if (typeof value !== "string" || value[0] !== "_") {
        throw new TypeError(`Not a VNID (got: ${value} - a ${typeof value})`);
    }

    let decoded = 0n;
    for (let i = 1; i < value.length; i++) {
        const charValue = vnidCharset.indexOf(value.charAt(i));
        if (charValue === -1) {
            throw new Error(`Invalid character in VNID value (${value.charAt(i)}).`);
        }
        decoded = (decoded * base) + BigInt(charValue);
    }
    return new UUIDv4(decoded.toString(16).padStart(32, "0"));
}
