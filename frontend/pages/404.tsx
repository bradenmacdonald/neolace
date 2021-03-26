import { Page } from 'components/Page';

export default function Home() {
    return (
        <Page
            title="Page Not Found (404) - TechNotes"
        >
            <h1>Page Not Found (Error 404)</h1>

            <p className="description">
                Sorry, the requested page could not be found.
            </p>
        </Page>
    );
}
