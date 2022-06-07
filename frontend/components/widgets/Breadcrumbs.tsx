import Link from "next/link";
import React from "react";
import { useIntl } from "react-intl";
import { Icon, IconId } from "./Icon";

// Helper types to require child element of a certain type:
type PropsOf<T> = T extends React.FunctionComponent<infer P> ? P : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildOfType<T extends React.JSXElementConstructor<any>> = React.ReactElement<PropsOf<T>, T>;

interface BreadcrumbProps {
    href?: string;
    children: React.ReactNode;
}


export const Breadcrumb: React.FunctionComponent<BreadcrumbProps> = (props) => {
    return (
        <li className="inline-flex items-center group mr-0">
            <span className="group-first:hidden pr-2 text-gray-500">
                <Icon icon="chevron-right" />
            </span>
            {props.href
                ? (
                    <Link href={props.href}>
                        <a className="inline-flex items-center text-sm font-medium">
                            {props.children}
                        </a>
                    </Link>
                )
                : <span className="inline-flex items-center text-sm font-medium">{props.children}</span>}
        </li>
    );
};
interface BreadcrumbsProps {
    children:
        // Can have multiple breadcrums as child (usual case); we also allow 'null' which is helpful for conditionally
        // including a breadcrumb like {condition ? <Breadcrumb/> : null}
        | (ChildOfType<typeof Breadcrumb> | null)[]
        // Or the child can be a single breadcrumb:
        | ChildOfType<typeof Breadcrumb>;
}

export const Breadcrumbs: React.FunctionComponent<BreadcrumbsProps> = (props) => {
    const intl = useIntl();
    return (
        <nav
            className="flex"
            aria-label={intl.formatMessage({ id: 'ByoZDD', defaultMessage: "Breadcrumbs" })}
        >
            <ol className="unstyled inline-flex items-center space-x-1 md:space-x-3">
                {props.children}
            </ol>
        </nav>
    );
};
