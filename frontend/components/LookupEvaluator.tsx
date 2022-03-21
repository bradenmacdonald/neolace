import React from 'react';
import { api, useLookupExpression } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';

import { MDTContext } from './markdown-mdt/mdt';
import { LookupValue } from './LookupValue';
import { Spinner } from './widgets/Spinner';

interface Props {
    expr: string;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Evaluate a Lookup Expression and display the resulting value
 */
export const LookupEvaluator: React.FunctionComponent<Props> = (props) => {
    const {result, error} = useLookupExpression(props.expr, {entryId: props.mdtContext.entryId});
    if (error) {
        if (error instanceof api.InvalidRequest && error.reason === api.InvalidRequestReason.LookupExpressionParseError) {
            return <p className="bg-red-100 border-red-800 border-2">
                <FormattedMessage
                    id="components.lookupEvaluator.parseError"
                    defaultMessage="The expression {expr} could not be parsed: {explanation}"
                    values={{
                        expr: props.expr,
                        explanation: error.message,
                    }}
                />
            </p>;
        } else {
            // This should be very rarely seen, as most evaluation errors other than parsing errors will result in an
            // error value, not an error response from the API.
            return <p className="bg-red-100 border-red-800 border-2">
                <FormattedMessage
                    id="components.lookupEvaluator.otherError"
                    defaultMessage="An unexpected error occurred: {explanation}"
                    values={{
                        explanation: error.message,
                    }}
                />
            </p>;
        }
    } else if (result === undefined) {
        return <Spinner />;
    }
    return <LookupValue value={result.resultValue} mdtContext={props.mdtContext} originalExpression={props.expr} />;
};
