import { TypeSense } from "neolace/deps/typesense.ts";
import { realmConfig } from "neolace/plugins/api.ts";

let clientPromise: Promise<TypeSense.Client> | undefined;

export function getTypeSenseClient(): Promise<TypeSense.Client> {
    if (clientPromise === undefined) {
        clientPromise = new Promise((resolve) => {
            const client = new TypeSense.Client({
                nodes: [{
                    host: realmConfig.typeSenseHost,
                    port: realmConfig.typeSensePort,
                    protocol: realmConfig.typeSenseProtocol,
                }],
                apiKey: realmConfig.typeSenseApiKey,
                connectionTimeoutSeconds: 2,
            });
            resolve(client);
        });
    }
    return clientPromise;
}
