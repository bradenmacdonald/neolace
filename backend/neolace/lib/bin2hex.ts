/**
 * @license Unlicense (see https://unlicense.org/ - public domain, use as you will, but no warranty of any kind)
 */
export const bin2hex = (binary: Uint8Array) => Array.from(binary).map((b) => b.toString(16).padStart(2, "0")).join("");
