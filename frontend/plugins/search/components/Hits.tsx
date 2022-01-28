import React from 'react';
import Link from 'next/link';
import { FormattedMessage } from 'react-intl';

import { connectInfiniteHits } from "react-instantsearch-dom";
import { Hit, InfiniteHitsProvided } from "react-instantsearch-core";
import { Highlight } from './Highlight';
import { Button } from 'components/widgets/Button';
import { api } from 'lib/api-client';


type HitsProps = InfiniteHitsProvided<Hit<api.EntryIndexDocument>>;

const CustomInfiniteHits: React.FunctionComponent<HitsProps> = ({
    hits,
    hasPrevious,
    hasMore,
    refinePrevious,
    refineNext,
}) => {
    return <div>
        {hasPrevious &&
            <Button onClick={refinePrevious}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-up inline-block mr-2 -mt-1" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
                </svg>
                <FormattedMessage id="plugin.search.showPreviousResults" defaultMessage="Show previous results"/>
            </Button>
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
        <br/>
        <Button disabled={!hasMore} onClick={refineNext}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-down inline-block mr-2" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
            <FormattedMessage id="plugin.search.showMoreResults" defaultMessage="Show more results"/>
        </Button>
    </div>
};

export const Hits = connectInfiniteHits(CustomInfiniteHits);
