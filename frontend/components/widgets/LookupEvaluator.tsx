import React from "react";
import { SDK, RefCacheContext, useLookupExpression } from "lib/sdk";
import { FormattedMessage } from "react-intl";

import { MDTContext } from "components/markdown-mdt/mdt";
import { LookupValue } from "./LookupValue";
import { Spinner } from "./Spinner";
import { ErrorMessage } from "./ErrorMessage";
import { Button } from "./Button";
import { DEVELOPMENT_MODE } from "lib/config";

interface Props {
    expr: string;
    mdtContext: MDTContext;
    hideShowMoreLink?: boolean;
    children?: never;
    pageSize?: number;
    /**
     * Do we expect all values to be in the reference cache already?
     * e.g. when viewing an entry, all the lookup values related to the entry should already be in the reference cache.
     * So if they're not, we need to show a warning (at least on development mode). (Because hitting the server
     * separately for each value is going to really decrease performance.)
     */
    expectAllValuesInRefCache?: boolean;
}

/**
 * Evaluate a Lookup Expression and display the resulting value
 */
export const LookupEvaluator: React.FunctionComponent<Props> = (props) => {
    const {resultValue, newReferenceCache, foundInCache, error} = useLookupExpression(props.expr, {entryId: props.mdtContext.entryId, pageSize: props.pageSize});

    if (error) {
        if (error instanceof SDK.InvalidRequest && error.reason === SDK.InvalidRequestReason.LookupExpressionParseError) {
            return <ErrorMessage>
                <FormattedMessage
                    id="Y7XZ3q"
                    defaultMessage="The expression could not be parsed: {explanation}"
                    values={{explanation: error.message}}
                />
            </ErrorMessage>;
        } else {
            // This should be very rarely seen, as most evaluation errors other than parsing errors will result in an
            // error value, not an error response from the API.
            return (
                <ErrorMessage>
                    <FormattedMessage
                        id="pntWdV"
                        defaultMessage="An unexpected error occurred: {explanation}"
                        values={{
                            explanation: error.message,
                        }}
                    />
                </ErrorMessage>
            );
        }
    } else if (resultValue === undefined) {
        return <Spinner />;
    }
    return (
        <RefCacheContext.Provider value={{refCache: newReferenceCache}}>
            <LookupValue value={resultValue} mdtContext={props.mdtContext} hideShowMoreLink={props.hideShowMoreLink} />
            {(DEVELOPMENT_MODE && props.expectAllValuesInRefCache && !foundInCache ? <ErrorMessage>Warning: not found in refCache.</ErrorMessage> : "")}
        </RefCacheContext.Provider>
    );
};

/**
 * Evaluate a Lookup Expression and display the resulting value, with pagination / infinite scroll
 */
export const LookupEvaluatorWithPagination: React.FunctionComponent<Props> = (props) => {
    const [numPagesDisplayed, setNumPages] = React.useState(1);
    React.useEffect(() => {
        // Reset to showing only one page if the expression changes.
        setNumPages(1);
    }, [props.expr, setNumPages]);
    // Evaluate the expression now to get basic information about it, like whether or not it's a paged value.
    // SWR will ensure that the inner <LookupEvaluator> doesn't send additional API requests for the same lookup expression.
    const { resultValue } = useLookupExpression(props.expr, {
        entryId: props.mdtContext.entryId,
        pageSize: props.pageSize,
    });

    const pageData = resultValue?.type === "Page" ? resultValue : undefined;

    if (pageData) {
        const numValuesPerPage = pageData.pageSize;
        const numPagesTotal = Math.ceil(pageData.totalCount / numValuesPerPage);
        const pages = [];
        for (let i = 0; i < numPagesDisplayed; i++) {
            const expr = i === 0 ? props.expr : `slice(${props.expr}, start=${i * numValuesPerPage}, size=${numValuesPerPage}, reslice=true)`;
            pages.push(<LookupEvaluator key={expr} expr={expr} mdtContext={props.mdtContext} hideShowMoreLink={true} pageSize={props.pageSize} />);
        }
        return <>
            {pages}
            {
                numPagesDisplayed < numPagesTotal &&
                    <Button icon="plus-lg" bold={true} onClick={() => { setNumPages(numPagesDisplayed + 1); }}>
                        <FormattedMessage
                            id="ntuqQX"
                            defaultMessage="Show more results"
                        />
                    </Button>
            }
            <p className="text-sm">
                <FormattedMessage
                    id="x3bfoo"
                    defaultMessage="Showing {numShowing, plural, one {# result} other {# results}} out of {numTotal} total."
                    values={{
                        numShowing: Math.min(numPagesDisplayed * numValuesPerPage, pageData.totalCount),
                        numTotal: pageData.totalCount,
                    }}
                    description="How many more items there are (at the end of a list)"
                />
            </p>
        </>;
    } else {
        return <LookupEvaluator expr={props.expr} mdtContext={props.mdtContext} pageSize={props.pageSize} />;
    }
};
