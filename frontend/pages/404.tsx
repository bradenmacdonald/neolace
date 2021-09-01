import Head from 'next/head';
import { useRouter } from 'next/router';

export default function FourOhFour() {

    const router = useRouter();

    return <>
        <Head>
            <title>Page Not Found (404)</title>
        </Head>
        <main className="py-12 px-4 mx-auto max-w-md">
            <h1 className="font-bold text-3xl mb-3">⚠️ Not Found</h1>
            <p>Sorry, the page you requested was not found.</p>
        </main>
    </>;
}
