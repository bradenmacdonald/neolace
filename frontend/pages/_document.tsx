/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Head, Html, Main, NextScript } from "next/document";

/**
 * A custom Next.js document, used to load any external stylesheets common to all pages.
 * See https://nextjs.org/docs/messages/no-stylesheets-in-head-component and
 * https://nextjs.org/docs/advanced-features/custom-document
 * @returns
 */
export default function Document() {
    return (
        <Html>
            <Head>
                {/* Load "Inter Var" from rsms.me, which is served by CloudFlare CDN */}
                <link href="https://rsms.me/inter/inter.css" rel="stylesheet" />
                {/* Load "Roboto Mono" as a variable font (:wght@100..700) from Google Fonts */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@100..700&amp;display=swap"
                    rel="stylesheet"
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
