import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";


const MembersOnlyPage: React.FunctionComponent<PluginPageProps> = function (props) {
    return (
        <SitePage title="Members Only">
            <h1 className="text-3xl font-semibold">Members Only</h1>
            <p>This will show the form to log in to the members only page.</p>
        </SitePage>
    );
};

export default MembersOnlyPage;
