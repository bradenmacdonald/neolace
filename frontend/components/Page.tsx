import React from 'react';
import Head from 'next/head'
import Link from 'next/link';
import { useRouter } from 'next/router';

import { UserContext, UserStatus } from 'components/user/UserContext';

interface Props {
    title: string;
}

/**
 * A standard TechNotes page.
 */
export const Page: React.FunctionComponent<Props> = (props) => {
    const user = React.useContext(UserContext);
    const router = useRouter();

    return <div className="container">
        <Head>
            <title>{props.title}</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
            <link rel="icon" type="image/vnd.microsoft.icon" href="/favicon.ico"/>
            {/* Load "Noto Sans" from Google's CDN */}
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&amp;display=swap" rel="stylesheet"/>
            <style>{`
                :root {
                    --site-primary-color: 0, 255, 0;
                    --site-link-color: 0, 0, 255;
                }
            `}</style>
        </Head>

        {/* Main header: */}
        <header id="tn-main-header" className="fixed-top bg-dark d-flex shadow-sm">
            <div className="col col-4 col-md-3 d-block p-2 p-md-3">
                <Link href="/">
                    <a><img alt="TechNotes" src="/technotes.svg" id="tn-main-logo" className="mw-100 mh-100" /></a>
                </Link>
            </div>
            <div className="col col-8 col-md-9 d-flex p-2 align-items-center justify-content-end">
                {/*
                <form className="form-inline mr-2 flex-grow-1">
                    <input className="form-control bg-dark border-secondary rounded-lg text-light mx-auto w-100" type="text" placeholder="Search TechNotes" aria-label="Search TechNotes" style={{maxWidth: '400px'}} />
                </form>
                */}
                {
                    // Show the user's avatar if they're logged in, otherwise a placeholder link to the login page.
                    user.status === UserStatus.LoggedIn ? (
                        <img className="rounded mh-100" style={{height: '60px'}} alt="User Avatar" src="/avatar-unsplash-theyshane.jpg" />
                    ): user.status === UserStatus.Anonymous ? (
                        <Link href="/login"><a className="text-muted">
                            <svg className="rounded mh-100" height="60px" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                                {/* Thanks https://icons.getbootstrap.com/icons/person-fill/ (MIT) */}
                            </svg>
                        </a></Link>
                    ): /* default case, user status is unknown: */ (
                        <svg className="rounded mh-100" height="60px" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" /></svg>
                    )
                }
            </div>
        </header>

        <main role="main" className="pt-2 pt-md-3">
            {props.children}

            <br/>According to the Router, you are on site {router.query.siteHost}.
        </main>
  </div>
};
