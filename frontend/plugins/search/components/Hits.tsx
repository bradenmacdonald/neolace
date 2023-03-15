/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";
import Link from "next/link";
import { FormattedMessage } from "react-intl";

import { Highlight, useInfiniteHits, UseInfiniteHitsProps, useSearchBox } from "react-instantsearch-hooks-web";
import { Button } from "components/widgets/Button";
import { Hit } from "./Hit";
import { useSchema } from "lib/sdk";

const highlightClasses = {
    // Override the color used to highlight matching terms in the result:
    highlighted: "bg-yellow-200 text-inherit",
};

export const InfiniteHits: React.FunctionComponent<UseInfiniteHitsProps<Hit>> = (props) => {
    const {
        // See https://www.algolia.com/doc/api-reference/widgets/infinite-hits/react-hooks/ for details of these:
        hits,
        // currentPageHits,
        // results,
        isFirstPage,
        isLastPage,
        showPrevious,
        showMore,
        // sendEvent,
    } = useInfiniteHits(props);
    const { query } = useSearchBox();

    const [schema] = useSchema();

    if (query === "") {
        return (
            <div className="min-h-[50vh] text-gray-500">
                <p>
                    <FormattedMessage
                        id="aWoo1x"
                        defaultMessage="Enter a search term above to see results."
                    />
                </p>
            </div>
        );
    } else if (hits.length === 0) {
        return (
            <div className="min-h-[50vh]">
                <p>
                    <FormattedMessage
                        id="IJPMVo"
                        defaultMessage='No entries were found matching the query "{query}".'
                        values={{ query }}
                    />
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-[50vh]">
            {!isFirstPage &&
                (
                    <div className="my-4">
                        <Button onClick={showPrevious} icon="chevron-up">
                            <FormattedMessage
                                id="x/ZUyH"
                                defaultMessage="Show previous results"
                            />
                        </Button>
                    </div>
                )}
            <ol>
                {hits.map((hit) => (
                    <li key={hit.objectID} className="my-3 pl-3 border-l-4 border-l-gray-300">
                        <div className="text-lg">
                            <Link
                                href={`/entry/${hit.key}`}
                                className="font-bold text-theme-link-color underline"
                            >
                                <Highlight hit={hit} attribute="name" classNames={highlightClasses} />
                            </Link>{" "}
                            ({schema?.entryTypes[hit.entryTypeKey]?.name ?? hit.entryTypeKey})
                        </div>
                        <p className="text-sm">
                            <Highlight hit={hit} attribute="description" classNames={highlightClasses} />
                        </p>
                    </li>
                ))}
            </ol>
            <div className="my-4">
                <Button disabled={isLastPage} onClick={showMore} icon="chevron-down">
                    <FormattedMessage id="ntuqQX" defaultMessage="Show more results" />
                </Button>
            </div>
        </div>
    );
};
