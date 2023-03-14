/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { IntlProvider } from "react-intl";

import { AvailablePluginsProvider } from "components/utils/ui-plugins-loader";

// Import global CSS (Tailwind-based)
import "../global-styles.css";

type ProviderProps = { children: React.ReactNode };
// DynamicIntlProviders: Helper to dynamically load i18n messages for react-intl
// For English:
// -> We're not using a babelTransform to remove 'defaultMessage' values from our JSX files, so we don't actually need
//    to load a separate file for English. We just immediately initiatlize an IntlProvider with no message data.
// -> Alternately, we could use the babel transform and load English translations from
//    "../content/compiled-locales/en.json" either always included in the bundle in every case (not dynamically) or
//    loaded dynamically only when English is active.
// For other languages:
// -> We use next/dynamic to load only the data for the active language, delaying the rendering of the React tree until
//    it is loaded (otherwise if you render while it's still loading, react-intl throws errors about missing
//    translations).
const DynamicIntlProviders = {
    en: (props: ProviderProps) => <IntlProvider locale="en" messages={{}}>{props.children}</IntlProvider>,
    fr: dynamic<ProviderProps>(() =>
        import("../content/compiled-locales/fr.json").then((data) =>
            // eslint-disable-next-line react/display-name
            (props: ProviderProps) => <IntlProvider locale="fr" messages={data.default}>{props.children}</IntlProvider>
        )
    ),
    ru: dynamic<ProviderProps>(() =>
        import("../content/compiled-locales/ru.json").then((data) =>
            // eslint-disable-next-line react/display-name
            (props: ProviderProps) => <IntlProvider locale="ru" messages={data.default}>{props.children}</IntlProvider>
        )
    ),
};

export default function NeolaceApp({ Component, pageProps }: AppProps) {
    const { locale, events: routerEvents } = useRouter();
    // Dynamically load the IntlProvider for the currently active language:
    const LoadIntlProvider = DynamicIntlProviders[locale as keyof typeof DynamicIntlProviders] ??
        DynamicIntlProviders.en;

    return (
        <LoadIntlProvider>
            <AvailablePluginsProvider>
                <Component {...pageProps} />
            </AvailablePluginsProvider>
        </LoadIntlProvider>
    );
}
