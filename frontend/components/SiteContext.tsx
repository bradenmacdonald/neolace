import React from 'react';
import { SiteData } from 'lib/api-client';

export const SiteContext = React.createContext<SiteData>({
    name: "━━━━━━━━━━━━━━",
    description: "",
    domain: "━━━━━━━━━━━━━━",
    footerMD: "",
    frontendConfig: {},
    shortId: "",
});
