import React from 'react';
import Head from 'next/head'
import Link from 'next/link';

import { SiteData } from 'lib/api-client';
import { MDTContext, RenderMDT } from './markdown-mdt/mdt';

interface Props {
    site: SiteData;
}

/**
 * Footer content for a Neolace site
 */
export const SiteFooter: React.FunctionComponent<Props> = (props) => {

    // props.site has the site data, but it can also be retrieved like this:
    // import { useRouter } from 'next/router';
    // const router = useRouter();
    // router.query.siteHost gives the site's domain

    return <footer className="mt-8 pt-1 text-gray-600 text-xs border-t border-t-gray-300 neo-typography">
        <RenderMDT
            mdt={props.site.footerMD}
            context={new MDTContext({})}
        />
    </footer>;
};
