import { NeolaceHttpResource, api } from "neolace/api/mod.ts";

export class HomePageResource extends NeolaceHttpResource {
    static paths = ["/"];

    GET = this.method({
        responseSchema: api.schemas.string,
        // deno-lint-ignore require-await
    }, async () => {
        this.response.headers.set("Content-Type", "text/html");
        return `
            <html>
                <head><title>Neolace API</title></head>
                <body>
                    This is the <strong>neolace<strong> API.
                </body>
            </html>
        `;
    });
}
