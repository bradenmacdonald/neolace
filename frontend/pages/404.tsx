/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import Head from "next/head";
// import { FormattedMessage } from 'react-intl';

export default function FourOhFour() {
    // TODO: figure out how to localize the 404 page; currently it's static and shared for all sites, and the intlProvider
    // is not in the React tree. Some of the logic from _app.tsx for loading locale data may have to be factored out and
    // made to work here too.

    return (
        <>
            <Head>
                <title>Not Found (404)</title>
            </Head>
            <main className="py-12 px-4 mx-auto max-w-md">
                <h1 className="font-bold text-3xl mb-3">⚠️ Not Found</h1>
                <p>
                    Sorry, the page you requested was not
                    found{/*<FormattedMessage id="error.notFoundDetails" defaultMessage="" />*/}
                </p>
            </main>
        </>
    );
}
