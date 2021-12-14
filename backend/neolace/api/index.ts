import { NeolaceHttpResource, Drash } from "neolace/api/mod.ts";

export class HomePageResource extends NeolaceHttpResource {
    public paths = ["/"];

    public GET(_request: Drash.Request, response: Drash.Response): void {
        response.html(`
            <html>
                <head><title>Neolace API</title></head>
                <body>
                    This is the <strong>neolace<strong> API.
                </body>
            </html>
        `);
    }
}
