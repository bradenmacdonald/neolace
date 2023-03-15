/**
 * @license public domain
 */
export const bin2hex = (binary: Uint8Array) => Array.from(binary).map((b) => b.toString(16).padStart(2, "0")).join("");
