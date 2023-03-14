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
import { FormattedMessage, useIntl } from "react-intl";

import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { Redirect } from "components/utils/Redirect";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { getSiteData, SiteData, UserStatus, useUser } from "lib/sdk";
import { AdminLinks } from "components/site-admin/site-admin";
import { ErrorMessage } from "components/widgets/ErrorMessage";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}


/**
 * This site admin page lists all of the users associated with the current site.
 * @param props
 * @returns
 */
const SiteAdminPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = useUser();

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }

    const titleTranslated = intl.formatMessage({defaultMessage: 'Site Administration', id: 'iOBTBR'})

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage
                title={titleTranslated}
                leftNavTopSlot={[{
                    id: "adminLinks",
                    priority: 20,
                    content: <AdminLinks/>,
                }]}
            >
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{props.site.name}</Breadcrumb>
                    <Breadcrumb href={`/admin`}>
                        <FormattedMessage id="iOBTBR" defaultMessage="Site Administration" />
                    </Breadcrumb>
                </Breadcrumbs>
                <h1 className="text-3xl font-semibold">{titleTranslated}</h1>
                <p>
                    <FormattedMessage defaultMessage="Select an admin tool from the menu on the left." id="AnSXvE" />
                </p>
                <ErrorMessage>
                    Note: The Site Administration tool is still being developed. For now, most functionality is read-only.
                    If you need a setting changed, email us at <a href="mailto:team@neolace.com">team@neolace.com</a>.
                </ErrorMessage>
            </SitePage>
        </SiteDataProvider>
    );
};

export default SiteAdminPage;

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
    return { props: { site } };
};
