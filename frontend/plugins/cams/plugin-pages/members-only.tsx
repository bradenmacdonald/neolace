import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { UserContext, UserStatus } from "components/user/UserContext";
import { Spinner } from "components/widgets/Spinner";
import { Redirect } from "components/utils/Redirect";
import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";


const MembersOnlyPage: React.FunctionComponent<PluginPageProps> = function (props) {

    const user = React.useContext(UserContext);

    const handleLogout = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        KeratinAuthN.logout().then(() => location.href = '/');
    }, []);

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/members-login" replace={true} />;
    } else if (user.status === UserStatus.Unknown) {
        return <SitePage title="Members Only"><Spinner/></SitePage>
    }

    return (
        <SitePage title="Members Only">
            <p className="float-right"><a href="#" onClick={handleLogout}>Logout</a></p>
            <h1 className="text-3xl font-semibold">Members Only</h1>
            <p>This will show the members only content.</p>

        </SitePage>
    );
};

export default MembersOnlyPage;
