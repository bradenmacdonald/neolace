import React from "react";
import { NextPage } from "next";
import { FormattedMessage, useIntl } from "react-intl";
import { api, NEW, useSiteData } from "lib/api-client";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { Spinner } from "components/widgets/Spinner";

const emptyArray: api.AnyEdit[] = []; // Declare this out here so it doesn't change on every render of DraftEntrypage

const DraftDetailsPage: NextPage = function (_props) {
    const intl = useIntl();
    // Look up the Neolace site by domain:
    const { site, siteError } = useSiteData();

    if (siteError instanceof api.NotFound) {
        return <FourOhFour />;
    } else if (siteError) {
        return <ErrorMessage>{String(siteError)}</ErrorMessage>;
    }

    const title = intl.formatMessage({ id: "drafts.title", defaultMessage: `Drafts` });

    return (
        <SitePage
            title={title}
            sitePreloaded={null}
            leftNavTopSlot={[]}
        >
            <Breadcrumbs>
                    <Breadcrumb href={`/`}>{site.name}</Breadcrumb>
                    <Breadcrumb>
                        <FormattedMessage id="draft.allDrafts" defaultMessage={"Drafts"} />
                    </Breadcrumb>
                </Breadcrumbs>

                <h1>{title}</h1>

                <p>Drafts will be listed here soon.</p>
        </SitePage>
    );
};

export default DraftDetailsPage;
