import { NeolaceHttpResource } from "neolace/api/mod.ts";

export class HomePageResource extends NeolaceHttpResource {
    static paths = ["/"];

    public GET() {
        this.response.body = `
            <html>
                <head><title>Neolace API</title></head>
                <body>
                    This is the <strong>neolace<strong> API.
                </body>
            </html>
        `;
        this.response.headers.set("Content-Type", "text/html");
   
        return this.response;
    }
}
