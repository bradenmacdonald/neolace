import Head from 'next/head';
import { FormattedMessage } from 'react-intl';

export default function FourOhFour() {

    const notFound = <FormattedMessage id="error.notFound" defaultMessage="Not Found" />;

    return <>
        <Head>
            <title>{notFound} (404)</title>
        </Head>
        <main className="py-12 px-4 mx-auto max-w-md">
            <h1 className="font-bold text-3xl mb-3">⚠️ {notFound}</h1>
            <p><FormattedMessage id="error.notFoundDetails" defaultMessage="Sorry, the page you requested was not found." /></p>
        </main>
    </>;
}
