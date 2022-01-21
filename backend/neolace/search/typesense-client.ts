import { TypeSense } from "neolace/deps/typesense.ts";
import { config } from "neolace/app/config.ts";

export const client = new TypeSense.Client({
    nodes: [{
        host: config.typeSenseHost,
        port: config.typeSensePort,
        protocol: config.typeSenseProtocol,
    }],
    apiKey: config.typeSenseApiKey,
    connectionTimeoutSeconds: 2,
});
