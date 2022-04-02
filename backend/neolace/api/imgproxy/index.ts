import { encode as encodeBase64UrlSafe } from "std/encoding/base64url.ts";
import { decode as decodeHex } from "std/encoding/hex.ts";

import { Drash } from "neolace/api/mod.ts";
import { config } from "neolace/app/config.ts";
import { sha256hmac } from "neolace/lib/sha256hmac.ts";

const hex2str = (hex: string) => new TextDecoder().decode(decodeHex(new TextEncoder().encode(hex)));
const imgProxySalt = hex2str(config.imgProxySaltHex);
const imgProxySecretKey = hex2str(config.imgProxySecretKeyHex);

/**
 * The image proxy API is used for simple and efficient generation of image thumbnails.
 *
 * It is only used on prod, as it requires a CDN. For development you can just use Next.js's built-in image resizing.
 * This also depends on the open source imgproxy server (https://imgproxy.net/) which must be running somewhere.
 *
 * The idea is that instead of displaying some huge image like
 *  https://s3.us-west-000.backblazeb2.com/neolace-technotes-obj/_1UGIdJvaMfC3PSOjkUX9Bs_luzOkplRUSY0w69z5930x
 * Users will request the image from a CDN using a URL like:
 *  https://images.technotes.org/_1UGIdJvaMfC3PSOjkUX9Bs_luzOkplRUSY0w69z5930x?width=800
 * Then the CDN will serve that image from its cache or request it from this API:
 *  https://api.technotes.org/imgproxy/_1UGIdJvaMfC3PSOjkUX9Bs_luzOkplRUSY0w69z5930x?width=800
 * This API will simply return a redirect response that will be served by imgproxy, with a signed URL. imgproxy will
 * require a signed URL so that our hosting resources are only used to serve Neolace images for the current site, and
 * not anything else.
 *  https://imgproxy.technotes.org/nQfRIrR00IzOTdrJoGCIu0xk9niUWkZx5aIPaCR-zLA/rs:fit:800/q:90/plain/http://s3.us-west-000.backblazeb2.com/neolace-technotes-obj/_6y8O8Hrd2jP3kuKxzMnzWb_5gUszkTOAUFVvb5Tc5uBpW@webp
 */
export class ImageProxyResource extends Drash.Resource {
    public paths = ["/imgproxy/(.+)"];

    GET = async (request: Drash.Request, response: Drash.Response) => {
        // Get the path after /imgproxy, e.g. "/imgproxy/foo" becomes "/foo"
        const path = request.url.split("/imgproxy", 2)[1].split("?")[0];
        // The URL of the original image on object storage.
        const imageSourceUrl = config.objStorePublicUrlPrefix + path;
        // The max size of the new image
        const maxWidthPx = parseInt(request.queryParam("width") ?? "-1", 10);
        if (maxWidthPx === -1) {
            // Redirect to the source image at full size:
            response.status = 301;
            response.headers.set("Location", imageSourceUrl);
            response.text("");
            return;
        }

        if (!config.imgProxyPrefix) {
            response.status = 400;
            response.json({ error: "The image proxy is not enabled for this Neolace realm" });
            return;
        }
        if (!config.imgProxyAllowedWidthsPx.includes(maxWidthPx)) {
            response.status = 400;
            response.json({
                error: "The only allowed image widths (in pixels) are: " + config.imgProxyAllowedWidthsPx.join(", "),
            });
            return;
        }
        // Always use webp images for thumbnails, regardless of the source image type
        const thumbnailImageFormat = "webp";

        // Build the request for imgproxy:
        const imgProxyRequest = `/rs:fit:${maxWidthPx}/q:90/plain/${imageSourceUrl}@${thumbnailImageFormat}`;

        const hmac = await sha256hmac(imgProxySecretKey, imgProxySalt + imgProxyRequest);
        const signature = encodeBase64UrlSafe(hmac);

        response.status = 301;
        response.headers.set("Location", `${config.imgProxyPrefix}/${signature}${imgProxyRequest}`);
        response.text("");
        return;
    };
}
