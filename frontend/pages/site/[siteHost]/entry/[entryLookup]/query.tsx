import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedUrlQuery } from 'querystring';
import { Blurhash } from "react-blurhash";
import { client, api, getSiteData, SiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import { LookupExpressionInput } from 'components/widgets/LookupExpressionInput';

interface PageProps {
    entry: api.EntryData;
    sitePreloaded: api.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryLookup: string;
}

const QueryPage: NextPage<PageProps> = function(props) {

    const intl = useIntl();
    const [queryExpression, setQueryExpression] = React.useState("");
    const handleLookupExpressionChange = React.useCallback((value: string) => setQueryExpression(value), [setQueryExpression]);

    const hasProps = props.entry.propertiesSummary?.length ?? 0 > 0;

    return (
        <SitePage
            sitePreloaded={props.sitePreloaded}
            leftNavTopSlot={[
                {id: "entryName", priority: 20, content: <>
                    <br/>
                    <strong>{props.entry.name}</strong>
                </>},
                {id: "entryId", priority: 21, content: <>
                    <code id="entry-id" data-entry-id={props.entry.id} className="font-mono font-light hidden">{props.entry.friendlyId}</code>
                </>},
                {id: "tableOfContents", priority: 50, content: <>
                    <ul id="left-toc-headings">
                        <li><Link  href={`/entry/${props.entry.friendlyId}#summary`}><a><FormattedMessage id="site.entry.summaryLink" defaultMessage="Summary"/></a></Link></li>
                        <li className={`${hasProps || "hidden"}`}><Link href={`/entry/${props.entry.friendlyId}#properties`}><a><FormattedMessage id="site.entry.propertiesLink" defaultMessage="Properties"/></a></Link></li>
                        {
                            props.entry.features?.Article?.headings.map(heading =>
                                <li key={heading.id}><Link href={`/entry/${props.entry.friendlyId}#h-${heading.id}`}><a>{heading.title}</a></Link></li>
                            )
                        }
                    </ul>
                </>},
            ]}
            title={props.entry.name}
        >
            <h1>{props.entry.name}</h1>

            <LookupExpressionInput value={queryExpression} onChange={handleLookupExpressionChange} placeholder={intl.formatMessage({id: "site.entry.queryInputPlaceholder", defaultMessage: "Enter a lookup expression..."})}/>

            <p><FormattedMessage id="site.entry.queryResult" defaultMessage="Result:" /></p>
            <p>Here would be the result for the query <small>{queryExpression}</small></p>
        </SitePage>
    );
}

export default QueryPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {

    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params!.siteHost);
    if (site === null) { return {notFound: true}; }
    let entry: api.EntryData;
    try {
        entry = await client.getEntry(context.params!.entryLookup, {siteId: site.shortId, flags: [
            api.GetEntryFlags.IncludeFeatures,  // We need the article headings
            api.GetEntryFlags.IncludePropertiesSummary,  // To know if we show the "Properties" nav link or not
            api.GetEntryFlags.IncludeReferenceCache,
        ]});
    } catch (err) {
        if (err instanceof api.NotFound) {
            return {notFound: true};
        }
        throw err;
    }

    if (entry.friendlyId !== context.params!.entryLookup) {
        // If the entry was looked up by an old friendlyId or VNID, redirect so the current friendlyId is in the URL:
        return {
            redirect: {
                destination: `/entry/${entry.friendlyId}/query`,
                permanent: true,
            },
        };
    }

    return {
        props: {
            entry,
            sitePreloaded: site,
        },
    };
}
