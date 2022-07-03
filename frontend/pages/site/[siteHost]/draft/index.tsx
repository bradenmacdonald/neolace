import React from "react";
import { NextPage } from "next";
import { FormattedMessage, useIntl } from "react-intl";
import { useSiteData } from "lib/api-client";

import { SitePage } from "components/SitePage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";

const DraftDetailsPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site } = useSiteData();

    const title = intl.formatMessage({ id: "2atspc", defaultMessage: `Drafts` });

    return (
        <SitePage title={title} leftNavTopSlot={[]}>
            <Breadcrumbs>
                <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                <Breadcrumb>
                    <FormattedMessage id="2atspc" defaultMessage="Drafts" />
                </Breadcrumb>
            </Breadcrumbs>

            <h1>{title}</h1>

            <p>Drafts will be listed here soon.</p>
        </SitePage>
    );
};

export default DraftDetailsPage;
