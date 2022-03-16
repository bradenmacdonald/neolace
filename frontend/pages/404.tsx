import Head from 'next/head';
// import { FormattedMessage } from 'react-intl';

export default function FourOhFour() {

    // TODO: figure out how to localize the 404 page; currently it's static and shared for all sites, and the intlProvider
    // is not in the React tree. Some of the logic from _app.tsx for loading locale data may have to be factored out and
    // made to work here too.
    const notFound = "Not Found";//<FormattedMessage id="error.notFound" defaultMessage="Not Found" />;

    return <>
        <Head>
            <title>{notFound} (404)</title>
        </Head>
        <main className="py-12 px-4 mx-auto max-w-md">
            <h1 className="font-bold text-3xl mb-3">⚠️ {notFound}</h1>
            <p>Sorry, the page you requested was not found{/*<FormattedMessage id="error.notFoundDetails" defaultMessage="" />*/}</p>
        </main>
    </>;
}
