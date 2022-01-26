import { TypeSense } from "neolace/deps/typesense.ts";
import { realmConfig } from "neolace/plugins/api.ts";

export const client = new TypeSense.Client({
    nodes: [{
        host: realmConfig.typeSenseHost,
        port: realmConfig.typeSensePort,
        protocol: realmConfig.typeSenseProtocol,
    }],
    apiKey: realmConfig.typeSenseApiKey,
    connectionTimeoutSeconds: 2,
});
