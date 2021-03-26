// Import global SCSS
import '../global-styles.scss';

import { UserProvider } from 'components/user/UserContext';

export default function TechNotesApp({ Component, pageProps }) {
    return <UserProvider>
        <Component {...pageProps} />
    </UserProvider>;
}
