/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";

import { SDK, client, useSiteData } from "lib/sdk";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import { InstantSearch } from "react-instantsearch-hooks-web";
import { InfiniteHits } from "../components/Hits";
import { SearchBox } from "../components/SearchBox";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { SitePage } from "components/SitePage";
import { PluginPageProps } from "components/utils/ui-plugins";

const SiteSearchPage: React.FunctionComponent<PluginPageProps> = function (props) {
    const { site, siteError } = useSiteData();
    const [connectionData, setConnectionData] = React.useState<SDK.SiteSearchConnectionData | undefined>();
    const [connectionError, setConnectionError] = React.useState<SDK.ApiError | undefined>();

    React.useEffect(() => {
        if (!site.key) {
            return; // This effect needs to wait until we have the site data.
        }
        // Get the search connection:
        let cancelled = false;
        client.getSearchConnection({ siteKey: site.key }).then((sc) => {
            if (!cancelled) {
                setConnectionData(sc);
            }
        }, (err) => {
            if (err instanceof SDK.ApiError) setConnectionError(err);
            else throw err;
        });
        return function cleanup() {
            cancelled = true;
        };
    }, [site.key]);

    const [adapter, setAdapter] = React.useState<TypesenseInstantSearchAdapter | undefined>();
    React.useEffect(() => {
        if (connectionData) {
            const endpoint = new URL(connectionData.searchEndpoint);
            setAdapter(
                new TypesenseInstantSearchAdapter({
                    server: {
                        // This API key only allows searching based on the current site and current user's permissions:
                        apiKey: connectionData.apiKey,
                        nodes: [
                            {
                                host: endpoint.hostname,
                                port: endpoint.port
                                    ? Number(endpoint.port)
                                    : (endpoint.protocol === "http:" ? 80 : 443),
                                protocol: endpoint.protocol === "http:" ? "http" : "https",
                            },
                        ],
                    },
                    additionalSearchParameters: {
                        query_by: "key,name,description,allProps,articleText",
                    },
                }),
            );
        } else {
            setAdapter(undefined);
        }
    }, [connectionData]);

    return (
        <SitePage title="Search">
            <h1 className="text-3xl font-semibold">Search {site.name}</h1>
            {(!adapter || !connectionData)
                ? (connectionError ? <ErrorMessage>{connectionError.message}</ErrorMessage> : <Spinner />)
                : (
                    <InstantSearch indexName={connectionData.siteEntriesCollection} searchClient={adapter.searchClient}>
                        <SearchBox />
                        <InfiniteHits />
                    </InstantSearch>
                )}
        </SitePage>
    );
};

export default SiteSearchPage;
