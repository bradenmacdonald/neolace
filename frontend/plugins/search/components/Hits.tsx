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
