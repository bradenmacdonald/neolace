import Link from 'next/link';
import React from 'react';
import { useIntl } from 'react-intl';
import { Icon, IconId } from './Icon';

interface BreadcrumbProps {
    href?: string;
    children: React.ReactNode;
}

export const Breadcrumb: React.FunctionComponent<BreadcrumbProps> = (props) => {
    return <li className="inline-flex items-center group mr-0">
        <span className="group-first:hidden pr-2 text-gray-500"><Icon icon="chevron-right" /></span>
        {props.href ?
            <Link href={props.href}><a className="inline-flex items-center text-sm font-medium">
                {props.children}
            </a></Link>
        :
            <span className="inline-flex items-center text-sm font-medium">{props.children}</span>
        }
  </li>;
}
interface BreadcrumbsProps {
    children: React.ReactElement<BreadcrumbProps, typeof Breadcrumb>[];
}

export const Breadcrumbs: React.FunctionComponent<BreadcrumbsProps> = (props) => {
    const intl = useIntl();
    return <nav className="flex" aria-label={intl.formatMessage({id: "ui.component.breadcrumbs.label", defaultMessage: "Breadcrumbs"})}>
        <ol className="unstyled inline-flex items-center space-x-1 md:space-x-3">
            {props.children}
        </ol>
    </nav>;
}
