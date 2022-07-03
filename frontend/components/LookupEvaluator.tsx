import React from "react";
import { api, useLookupExpression } from "lib/api-client";
import { FormattedMessage } from "react-intl";

import { MDTContext } from "./markdown-mdt/mdt";
import { LookupValue } from "./LookupValue";
import { Spinner } from "./widgets/Spinner";
import { ErrorMessage } from "./widgets/ErrorMessage";
import { Button } from "./widgets/Button";

interface Props {
    expr: string;
    mdtContext: MDTContext;
    hideShowMoreLink?: boolean;
    children?: never;
    pageSize?: number;
}

/**
 * Evaluate a Lookup Expression and display the resulting value
 */
export const LookupEvaluator: React.FunctionComponent<Props> = (props) => {
    const {result, error} = useLookupExpression(props.expr, {entryId: props.mdtContext.entryId, pageSize: props.pageSize});

    const mdtContext = React.useMemo(() => props.mdtContext.childContextWith({refCache: result?.referenceCache}), [result?.referenceCache, props.mdtContext])

    if (error) {
        if (error instanceof api.InvalidRequest && error.reason === api.InvalidRequestReason.LookupExpressionParseError) {
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
    } else if (result === undefined) {
        return <Spinner />;
    }
    return <LookupValue value={result.resultValue} mdtContext={mdtContext} hideShowMoreLink={props.hideShowMoreLink} />;
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
    const { result, error } = useLookupExpression(props.expr, {
        entryId: props.mdtContext.entryId,
        pageSize: props.pageSize,
    });

    const pageData = result?.resultValue.type === "Page" ? result.resultValue : undefined;

    if (pageData) {
        const numValuesPerPage = pageData.pageSize;
        const numPagesTotal = Math.ceil(pageData.totalCount / numValuesPerPage);
        const pages = [];
        for (let i = 0; i < numPagesDisplayed; i++) {
            const expr = i === 0 ? props.expr : `slice(${props.expr}, start=${i * numValuesPerPage}, size=${numValuesPerPage})`;
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
