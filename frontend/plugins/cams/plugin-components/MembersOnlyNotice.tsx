import { ErrorMessage } from "components/widgets/ErrorMessage";
import { api } from "lib/api-client";
import { UserStatus, useUser } from "lib/authentication";
import Link from "next/link";
import React from "react";

export const MembersOnlyNotice: React.FunctionComponent<{ entry: api.EntryData }> = ({ entry }) => {
    const user = useUser();
    // TODO: change this to check the user's permission on the returned entry
    if (
        entry.description === "" && !entry.propertiesSummary?.length &&
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
