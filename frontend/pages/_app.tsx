// Import global CSS (Tailwind-based)
import '../global-styles.css';

import { UserProvider } from 'components/user/UserContext';

export default function TechNotesApp({ Component, pageProps }) {
    return <UserProvider>
        <Component {...pageProps} />
    </UserProvider>;
}
