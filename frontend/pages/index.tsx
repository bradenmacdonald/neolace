import React from 'react';
import { NextPage } from 'next';
import Link from 'next/link';

import { Page } from 'components/Page';
import { UserContext, UserStatus } from 'components/user/UserContext';

const HomePage: NextPage = function() {

    const user = React.useContext(UserContext);

    return (
        <Page
            title="TechNotes"
        >
            <h1>
                {`Welcome to TechNotes${user.status == UserStatus.LoggedIn ? `, ${user.username}`: ''}!`}
            </h1>

            <p>
                TechNotes is the open engineering library that will combine reference articles, design examples, datasets, patents, technical drawings, and discussion forums together in one integrated resource, with all content available under an open license. Our goal is to provide a complete and permanent description of humanity's technology, to accelerate present-day innovation and to serve as an invaluable resource if we need to settle other planets or rebuild civilization after an apocalypse. <a href="https://www.technotes.org/">Learn more about the project</a>.
            </p>

            <p>This is a <strong>pre-alpha prototype</strong> with almost no features available, but hopefully enough to give you a taste of what's to come. Our initial focus is content related to renewable energy and the green economy transition.</p>

            <h2>Sample Articles</h2>
            <ul>
                <li><Link href="/tech/t-pv-module"><a>Photovoltaic module</a></Link> (Tech Concept)</li>
                <li><Link href="/tech/t-wnd-tb"><a>Wind turbine</a></Link> (Tech Concept)</li>
                <li><Link href="/design/d-pv-mc4"><a>MC4 Connector</a></Link> (Design)</li>
                <li><Link href="/process/p-geoeng-slr"><a>Solar geoengineering</a></Link> (Process)</li>
            </ul>
            <h2>License</h2>
            <p>Text content (articles and descriptions) is available under the terms of the <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0 license</a>. Images and other media files are available under various licenses - refer to each item's page for details.</p>
        </Page>
    );
}

export default HomePage;
