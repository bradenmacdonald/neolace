import React from 'react';

import { api, client, useSiteData } from 'lib/api-client';
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import { InstantSearch } from "react-instantsearch-dom";
import { Hits } from "../components/Hits";
import { SearchBox } from '../components/SearchBox';

const SiteSearchPage: React.FunctionComponent = function(props) {

    const {site} = useSiteData();

    const [connectionData, setConnectionData] = React.useState<api.SiteSearchConnectionData|undefined>();

    React.useEffect(() => {
        if (!site.shortId) {
            return;  // This effect needs to wait until we have the site data.
        }
        // Get the search connection:
        let cancelled = false;
        client.getSearchConnection({siteId: site.shortId}).then(sc => {
            if (!cancelled) {
                setConnectionData(sc);
            }
        });
        return function cleanup() {
            cancelled = true;
        };
    }, [site.shortId]);

    const [adapter, setAdapter] = React.useState<TypesenseInstantSearchAdapter|undefined>();
    React.useEffect(() => {
        if (connectionData) {
            const endpoint = new URL(connectionData.searchEndpoint);
            setAdapter(
                new TypesenseInstantSearchAdapter({
                    server: {
                        apiKey: connectionData.apiKey,  // This API key only allows searching based on the current site and current user's permissions
                        nodes: [
                            {host: endpoint.hostname, port: endpoint.port, protocol: endpoint.protocol === "http:" ? "http" : "https"},
                        ],
                    },
                    cacheSearchResultsForSeconds: 2 * 60, // Cache search results from server. Defaults to 2 minutes. Set to 0 to disable caching.
                    additionalSearchParameters: {
                        queryBy: "name,description,friendlyId,articleText",
                    },
                  })
            );
        } else {
            setAdapter(undefined);
        }
    }, [connectionData]);

    const [currentQuery, setCurrentQuery] = React.useState("");

    if (!adapter || !connectionData) {
        return <p>Loading search...</p>;
    }

    return (<>
        <h1 className="text-3xl font-semibold">Search {site.name}</h1>
        <InstantSearch indexName={connectionData.siteEntriesCollection} searchClient={adapter.searchClient} onSearchStateChange={({query}) => { setCurrentQuery(query); }}>
            <SearchBox />
            <Hits currentQuery={currentQuery} />
        </InstantSearch>
    </>);
}

export default SiteSearchPage;
