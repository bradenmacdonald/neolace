/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { useIntl } from "react-intl";

import { getSiteData, SiteData, UserStatus, useUser } from "lib/sdk";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { Redirect } from "components/utils/Redirect";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const AccountPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = useUser();

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }

    const title = intl.formatMessage({ id: "YzZa8+", defaultMessage: "My Profile" }, { siteName: props.site.name });

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage title={title}>
                <h1 className="text-3xl font-semibold">{title}</h1>

                <p>
                    Profile for {user.fullName}{" "}
                    ({user.username}). This will have options to change your name, reset password, etc.
                </p>
            </SitePage>
        </SiteDataProvider>
    );
};

export default AccountPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) throw new Error("Internal error - missing URL params."); // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };

    // Account features are only available on the "home site".
    if (!site.isHomeSite) {
        return { redirect: { destination: `${site.homeSiteUrl}/account/`, permanent: true } };
    }

    return {
        props: {
            site,
        },
    };
};
