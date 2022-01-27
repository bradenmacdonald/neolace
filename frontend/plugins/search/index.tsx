import React from 'react';
import { NextPage } from 'next';

import { SiteContext } from 'components/SiteContext';
import { api, client } from 'lib/api-client';

const SiteSearchPage: NextPage = function(props) {

    const site = React.useContext(SiteContext);

    const [connectionData, setConnectionData] = React.useState<api.SiteSearchConnectionData>({
        apiKey: '',
        searchEndpoint: '',
        siteEntriesCollection: '',
    });

    React.useEffect(() => {
        // Get the search connection:
        client.getSearchConnection({siteId: site.shortId}).then(sc => {
            setConnectionData(sc);
        });
    }, [site.shortId]);

    return (
        <>
            <h1 className="text-3xl font-semibold">Search {site.name}</h1>
            
            <p className="my-4">This will let you search the site.</p>

            {
                connectionData.apiKey ? <p>We will use API key {connectionData.apiKey}</p> : <p>Loading...</p>
            }
        </>
    );
}

export default SiteSearchPage;
