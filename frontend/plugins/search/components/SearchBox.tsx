import React, { ChangeEvent } from "react";
import { useIntl } from "react-intl";
import { useSearchBox, type UseSearchBoxProps } from "react-instantsearch-hooks-web";

import { TextInput } from "components/form-input/TextInput";
import { useRouter } from "next/router";

export const SearchBox: React.FunctionComponent<UseSearchBoxProps> = (props) => {
    const intl = useIntl();
    const { query, refine, clear } = useSearchBox(props);
    const [value, setValue] = React.useState(query);
    const inputEl = React.useRef<HTMLInputElement>(null);
    const {replace} = useRouter();

    const handleChange = React.useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
        replace(`/search?${new URLSearchParams({q: event.currentTarget.value}).toString()}`, undefined, {
            shallow: true,
            scroll: false,
        });
    }, [replace]);

    // Track when the value coming from the React state changes to synchronize it with InstantSearch.
    React.useEffect(() => {
        if (query !== value) {
            refine(value);
        }
        // We don't want to track when the InstantSearch query changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, refine]);

    // Track when the InstantSearch query changes to synchronize it with the React state.
    React.useEffect(() => {
        // We bypass the state update if the input is focused to avoid concurrent updates when typing.
        if (document.activeElement !== inputEl.current && query !== value) {
            setValue(query);
        }
        // We don't want to track when the React state value changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // When the search page is first loaded:
    React.useEffect(
        () => {
            // Set the current search term based the query string
            if (location.search) {
                const params = new URLSearchParams(location.search);
                const initialQuery = params.get("q");
                if (initialQuery) {
                    setValue(initialQuery);
                }
            }
            // Focus on the search box:
            inputEl.current && inputEl.current.focus();
        },
        [],
    );

    return (
        <form noValidate action="" role="search" onSubmit={(ev) => ev.preventDefault()}>
            <TextInput
                type="search"
                icon="search"
                className="w-[600px] max-w-full my-4"
                value={value}
                onChange={handleChange}
                placeholder={intl.formatMessage({
                    id: "mN/13p",
                    defaultMessage: "Enter a search term",
                })}
                inputRef={inputEl}
            />
            {/*<button onClick={() => refine('')}>Reset query</button>*/}
        </form>
    );
};
