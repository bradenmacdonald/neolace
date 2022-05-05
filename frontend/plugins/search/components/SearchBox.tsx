import React from 'react';
import { SearchBoxProvided } from 'react-instantsearch-core';
import { connectSearchBox } from 'react-instantsearch-dom';
import { FormattedMessage, useIntl } from 'react-intl';

import { TextInput } from 'components/widgets/TextInput';

const CustomSearchBox: React.FunctionComponent<SearchBoxProvided> = ({ currentRefinement, isSearchStalled, refine }) => {

    const intl = useIntl();
    const inputEl = React.useRef<HTMLInputElement>(null);
    React.useEffect(
        () => {
            // Focus on the search box when this component is mounted.
            inputEl.current && inputEl.current.focus();
        },
        [],
    );

    return <form noValidate action="" role="search" onSubmit={(ev) => ev.preventDefault()}>
        <TextInput
            type="search"
            icon="search"
            className="w-[600px] max-w-full my-4"
            value={currentRefinement}
            onChange={event => refine(event.currentTarget.value)}
            placeholder={intl.formatMessage({id: "plugin.search.searchBoxPlaceholder", defaultMessage: "Enter a search term"})}
            inputRef={inputEl}
        />
        {/*<button onClick={() => refine('')}>Reset query</button>*/}
        {isSearchStalled && currentRefinement && <div>
            <FormattedMessage id="plugin.search.stalledWarning" defaultMessage="Search has stalled or an error occurred."/>
        </div>}
    </form>;
}

export const SearchBox = connectSearchBox(CustomSearchBox);
