import React from 'react';
import { api } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';

import { MDTContext } from './markdown-mdt/mdt';
import { LookupValue } from './LookupValue';

interface Props {
    expr: string;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Evaluate a Lookup Expression and display the resulting value
 */
export const LookupEvaluator: React.FunctionComponent<Props> = (props) => {
    const cachedValue = props.mdtContext.refCache.lookups.find(v => v.lookupExpression === props.expr);
    if (cachedValue) {
        return <LookupValue value={cachedValue.value} mdtContext={props.mdtContext} />
    }
    return <span className='text-red-500'>{props.expr} not found in {props.mdtContext.refCache.lookups.length}</span>;
};
