import React from 'react';
import Link from 'next/link';

import { connectInfiniteHits } from "react-instantsearch-dom";
import { Hit, InfiniteHitsProvided } from "react-instantsearch-core";
import { VNID } from 'neolace-api/types.ts';

interface Doc {
    id: VNID;
    name: string;
    type: string;
    description: string;
    articleText: string;
}
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
                    <Link href={`/entry/${hit.id}`}><a className="font-bold text-theme-link-color underline">{hit.name}</a></Link> ({hit.type})
                </li>
            ))}
        </ol>
        <button disabled={!hasMore} onClick={refineNext}>
            Show more
        </button>
    </div>
};

export const Hits = connectInfiniteHits(CustomInfiniteHits);
