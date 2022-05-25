import React, { ReactNode } from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";

import { getSiteData, SiteData } from "lib/api-client";
import { SitePage } from "components/SitePage";
import { UserContext, UserStatus } from "components/user/UserContext";
import { Redirect } from "components/utils/Redirect";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

/** If running in a browser, get the #hash from the URL, excluding the "#" itself. */
function getHash() {
    if (typeof window !== "undefined") {
        if (window.location.hash) {
            return window.location.hash.substr(1);
        }
    }
    return "";
}

enum TokenStatus {
    Unknown,
    NoTokenPresent,
    ValidatingToken,
    TokenValid,
    TokenInvalid,
}

const PasswordlessLoginPage: NextPage<PageProps> = function (props) {
    const user = React.useContext(UserContext);
    const [tokenStatus, setTokenStatus] = React.useState(TokenStatus.Unknown);

    // Check the status of the token. This runs only once.
    React.useEffect(() => {
        const hash = getHash();
        if (hash) {
            setTokenStatus(TokenStatus.ValidatingToken);
            user.submitPasswordlessLoginToken(hash).then(() => {
                setTokenStatus(TokenStatus.TokenValid);
            }).catch((err) => {
                setTokenStatus(TokenStatus.TokenInvalid);
            });
        } else {
            setTokenStatus(TokenStatus.NoTokenPresent);
        }
    }, []);

    let detail: ReactNode = <>Error: unknown status enum value</>;
    switch (tokenStatus) {
        case TokenStatus.Unknown: {
            detail = <>...</>;
            break;
        }
        case TokenStatus.ValidatingToken: {
            detail = <>Logging you in...</>;
            break;
        }
        case TokenStatus.NoTokenPresent: {
            if (user.status === UserStatus.LoggedIn) {
                detail = <Redirect to="/" replace={true} />;
            } else {
                detail = <>Token missing. The link you clicked did not work for some reason.</>;
            }
            break;
        }
        case TokenStatus.TokenValid: {
            detail = <Redirect to="/" replace={true}>You are now logged in.</Redirect>;
            break;
        }
        case TokenStatus.TokenInvalid: {
            if (user.status === UserStatus.LoggedIn) {
                detail = <>That link is invalid or has expired, but you were already logged in anyways.</>;
            } else {
                detail = <>That link is invalid or has expired.</>;
            }
            break;
        }
    }

    return (
        <SitePage
            title={`Log in to ${props.site.name}`}
            sitePreloaded={props.site}
        >
            <h1 className="text-3xl font-semibold">Log in to {props.site.name}</h1>

            <p className="my-4">{detail}</p>
        </SitePage>
    );
};

export default PasswordlessLoginPage;

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
    if (site === null) {
        return { notFound: true };
    }

    return {
        props: {
            site,
        },
    };
};
