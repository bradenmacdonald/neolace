import React from 'react';
import Link from 'next/link';
import { FormattedMessage } from 'react-intl';

import { connectInfiniteHits } from "react-instantsearch-dom";
import { Hit, InfiniteHitsProvided } from "react-instantsearch-core";
import { Highlight } from './Highlight';
import { Button } from 'components/widgets/Button';
import { api } from 'lib/api-client';


interface HitsProps extends InfiniteHitsProvided<Hit<api.EntryIndexDocument>> {
    currentQuery: string;
}

const CustomInfiniteHits: React.FunctionComponent<HitsProps> = ({
    currentQuery,
    hits,
    hasPrevious,
    hasMore,
    refinePrevious,
    refineNext,
}) => {
    if (currentQuery === "") {
        return <div className="min-h-[50vh] text-gray-500">
            <p><FormattedMessage id="plugin.search.enterSearchTerm" defaultMessage="Enter a search term above to see results."/></p>
        </div>
    } else if (hits.length === 0) {
        return <div className="min-h-[50vh]">
            <p><FormattedMessage id="plugin.search.noResults" defaultMessage='No entries were found matching the query "{query}".' values={{query: currentQuery}}/></p>
        </div>
    }
    return <div className="min-h-[50vh]">
        {hasPrevious &&
            <div className="my-4">
                <Button onClick={refinePrevious} icon="chevron-up">
                    <FormattedMessage id="plugin.search.showPreviousResults" defaultMessage="Show previous results"/>
                </Button>
            </div>
        }
        <ol>
            {hits.map(hit => (
                <li key={hit.objectID} className="my-3 pl-3 border-l-4 border-l-gray-300">
                    <div className="text-lg">
                        <Link href={`/entry/${hit.friendlyId}`}><a className="font-bold text-theme-link-color underline"><Highlight hit={hit} attribute="name" /></a></Link> ({hit.type})
                    </div>
                    <p className="text-sm"><Highlight hit={hit} attribute="description" /></p>
                </li>
            ))}
        </ol>
        <div className="my-4">
            <Button disabled={!hasMore} onClick={refineNext} icon="chevron-down">
                <FormattedMessage id="plugin.search.showMoreResults" defaultMessage="Show more results"/>
            </Button>
        </div>
    </div>
};

export const Hits = connectInfiniteHits(CustomInfiniteHits);
