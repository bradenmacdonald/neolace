import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";
import { Redirect } from "components/utils/Redirect";
import { UserStatus, useUser } from "lib/api";
import { LookupEvaluatorWithPagination } from "components/widgets/LookupEvaluator";
import { MDTContext } from "components/markdown-mdt/mdt";

const MembersOnlyPage: React.FunctionComponent<PluginPageProps> = function (props) {
    const user = useUser();

    const handleLogout = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        user.authApi.logout().then(() => location.href = "/");
    }, [user.authApi]);

    const mdtContext = React.useMemo(() => new MDTContext({}), []);

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/members-login" replace={true} />;
    } else if (user.status === UserStatus.Unknown) {
        return (
            <SitePage title="Members Only">
                <Spinner />
            </SitePage>
        );
    }

    return (
        <SitePage title="Members Only">
            <p className="float-right">
                <a href="#" onClick={handleLogout}>Logout</a>
            </p>
            <h1 className="text-3xl font-semibold">Members Only</h1>

            <p>Here are the members only handouts, reports, and other content that you have access to:</p>
            <LookupEvaluatorWithPagination
                expr={`allEntries().filter(entryType=entryType("_3hRDtDlD9RDneg2nBN2Rep"))`}
                mdtContext={mdtContext}
                pageSize={50}
            />
        </SitePage>
    );
};

export default MembersOnlyPage;
