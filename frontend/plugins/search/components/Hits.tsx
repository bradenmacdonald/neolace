import React from 'react';
import Link from 'next/link';

import { connectInfiniteHits } from "react-instantsearch-dom";
import { Hit, InfiniteHitsProvided } from "react-instantsearch-core";
import { Doc } from './Doc';
import { Highlight } from './Highlight';


type HitsProps = InfiniteHitsProvided<Hit<Doc>>;

const CustomInfiniteHits: React.FunctionComponent<HitsProps> = ({
    hits,
    hasPrevious,
    hasMore,
    refinePrevious,
    refineNext,
}) => {
    return <div>
        {hasPrevious &&
            <button onClick={refinePrevious}>
                Show previous
            </button>
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
        <button disabled={!hasMore} onClick={refineNext}>
            Show more
        </button>
    </div>
};

export const Hits = connectInfiniteHits(CustomInfiniteHits);
