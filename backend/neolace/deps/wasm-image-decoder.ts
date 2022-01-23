//import decode from "https://deno.land/x/wasm_image_decoder@v0.0.4/mod.js";
// Use a fork with a newer version of Rust's "image" crate, which supports color when decoding WebP images.
// Once the "image" crate version 0.24 is released, we can push these changes upstream.
//import decode from "https://raw.githubusercontent.com/neolace-dev/wasm-image-decoder/bump-image-crate/mod.js";
import decode from "./wasm-image-decoder/mod.js"; // GitHub doesn't serve the .wasm file with the right MIME type

export const decodeImage = decode;
