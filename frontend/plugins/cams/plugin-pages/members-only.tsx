import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";
import { Redirect } from "components/utils/Redirect";
import { UserStatus, useUser } from "lib/authentication";


const MembersOnlyPage: React.FunctionComponent<PluginPageProps> = function (props) {

    const user = useUser();

    const handleLogout = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        user.authApi.logout().then(() => location.href = '/');
    }, [user.authApi]);

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
