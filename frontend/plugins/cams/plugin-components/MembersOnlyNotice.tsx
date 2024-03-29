/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license All Rights reserved.
 */
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { SDK, UserStatus, useUser } from "lib/sdk";
import Link from "next/link";
import React from "react";

export const MembersOnlyNotice: React.FunctionComponent<{ entry: SDK.EntryData }> = ({ entry }) => {
    const user = useUser();
    // TODO: change this to check the user's permission on the returned entry
    if (
        entry.description === "" && !entry.propertiesSummary?.length &&
        entry.entryType.name === "Members Only Handout" &&
        (user.status === UserStatus.Anonymous || user.username !== "camsmember")
    ) {
        return (
            <ErrorMessage>
                This content is only available to members. Please use the{" "}
                <Link href="/members-login">
                    Member Login
                </Link>{" "}
                to access it.
            </ErrorMessage>
        );
    } else {
        return null;
    }
};
