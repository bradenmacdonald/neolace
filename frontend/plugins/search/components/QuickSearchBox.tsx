import React, { ChangeEvent } from "react";
import { useIntl } from "react-intl";

import { TextInput } from "components/form-input";
import { useRouter } from "next/router";

// Note: The InstantSearch + TypeSense API code uses about 40kB gzipped so to keep our JS size small,
// we only load it on the /search page as needed.

export const QuickSearchBox: React.FunctionComponent = (props) => {
    const intl = useIntl();
    const {asPath, push } = useRouter();
    // Work around Next.js bug where 'asPath' differs between server and client when rewrite is used:
    // e.g. server asPath = "/site/technotes.local.neolace.net/search?q=test", client = "/search?q=test"
    const currentUrl = asPath.startsWith("/site/") ? asPath.substring(asPath.indexOf("/", 6)) : asPath;

    const [searchTerm, setSearchTerm] = React.useState("");

    const handleChange = React.useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.currentTarget.value);
    }, []);

    const doSearch = React.useCallback((ev: React.FormEvent) => {
        ev.preventDefault();
        push(`/search?` + new URLSearchParams({q: searchTerm}).toString());
    }, [searchTerm, push]);

    const isOnSearchPage = currentUrl === "/search" || currentUrl.startsWith("/search?");

    return (
        <form noValidate action="" role="search" onSubmit={doSearch}>
            <TextInput
                type="search"
                icon="search"
                className={`w-[600px] max-w-full !border-slate-300 ${isOnSearchPage ? "opacity-30 hover:opacity-70" : ""}`}
                value={searchTerm}
                onChange={handleChange}
                placeholder={intl.formatMessage({
                    id: "xmcVZ0",
                    defaultMessage: "Search",
                })}
            />
        </form>
    );
};
