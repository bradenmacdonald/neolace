import { C, Field } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, NeolaceHttpResource } from "neolace/rest-api/mod.ts";

export class HealthCheckResource extends NeolaceHttpResource {
    public paths = ["/health"];

    GET = this.method({
        responseSchema: api.schemas.HealthCheckResponse,
        description: "Check the health of the Neolace API",
    }, async () => {
        let databaseWorking = false;
        try {
            const graph = await getGraph();
            const result = await graph.read((tx) => tx.queryOne(C`RETURN 123 AS x`.givesShape({ x: Field.Int })));
            if (result.x === 123) {
                databaseWorking = true;
            }
        } catch { /* Ignore errors */ }
        return {
            reachable: true,
            databaseWorking,
        };
    });
}
