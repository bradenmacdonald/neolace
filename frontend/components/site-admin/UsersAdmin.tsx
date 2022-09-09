import React from "react";
import { FormattedMessage } from "react-intl";
import useSWR from "swr";

import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { client, useSiteData, useUser } from "lib/api";


/**
 * This site admin page lists all of the users associated with the current site.
 * @param props
 * @returns
 */
export const SiteUsersAdminTool: React.FunctionComponent = function (_props) {
    const user = useUser();
    const {site} = useSiteData();

    const page = 1;
    // TODO: an option to filter by username or group name. Add to the SWR key.

    // The key for caching the list of users. We include the current user's user name so that if the uesr logs out then
    // logs in again as a different admin user, they'll still see the correct results (though that's a rare case).
    const key = `siteAdmin:${site.shortId}:${user.username}:users:list:page${page}`;
    const { data, error } = useSWR(key, async () => {
        return await client.getSiteUsers({page, siteId: site.shortId});
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (error) {
        return (
            <ErrorMessage><FormattedMessage defaultMessage="Unable to load users: {error}" id="iRRgmi" values={{error: error.message ?? "Unknown error"}}/></ErrorMessage>
        );
    }

    return (<>
        <p>
            {(
                data === undefined ? <FormattedMessage defaultMessage="Loading..." id="gjBiyj"/> :
                <FormattedMessage defaultMessage="Showing {totalCount, plural, one {# user} other {# users}}." id="KWCDqi" values={{totalCount: data?.totalCount}}/>
            )}
        </p>
        <table className="[&_th]:text-left [&_td]:pr-2 [&_th]:pr-2">
            <thead>
                <tr>
                    <th><FormattedMessage defaultMessage="Name" id="HAlOn1" /></th>
                    <th><FormattedMessage defaultMessage="Username" id="JCIgkj" /></th>
                    <th><FormattedMessage defaultMessage="User Type" id="Gt4GcJ" /></th>
                    <th><FormattedMessage defaultMessage="Groups" id="hzmswI" /></th>
                </tr>
            </thead>
            <tbody>
                {
                    data?.values.map((row) => (
                        <tr key={row.username}>
                            <td>{row.fullName}</td>
                            <td>{row.username}</td>
                            <td>{(row.isBot ? <FormattedMessage defaultMessage="Bot" id="03nvvB" /> : <FormattedMessage defaultMessage="Regular User" id="ws6YOC" />)}</td>
                            <td>{row.groups ? row.groups.map((g) => <span key={g.id}>{g.name}{" "}</span>) : "▀▀▀▀▀▀▀"}</td>
                        </tr>
                    )) ?? <tr><td colSpan={100}><Spinner/></td></tr>
                }
            </tbody>
        </table>
    </>);
};
