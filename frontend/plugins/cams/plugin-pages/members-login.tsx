import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { Control, Form } from "components/widgets/Form";
import { TextInput } from "components/widgets/TextInput";
import { Redirect } from "components/utils/Redirect";
import { defineMessage } from "components/utils/i18n";
import { Button } from "components/widgets/Button";
import { ActionStatus, ActionStatusDisplay, useActionStatus } from "components/widgets/ActionStatusIndicator";
import { SuccessMessage } from "components/widgets/SuccessMessage";
import { FormattedMessage } from "react-intl";
import { UserStatus, useUser } from "lib/authentication";

const MembersLoginPage: React.FunctionComponent<PluginPageProps> = function (props) {
    const user = useUser();

    const [password, setPassword] = React.useState("");
    const handlePasswordChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.currentTarget.value),
        [],
    );
    const [loginStatus, wrapLogin, setLoginStatus] = useActionStatus();
    const handleLogin = React.useCallback(() => {
        // The username below is the VNID of the shared "Cams Member" user account.
        wrapLogin(user.authApi.advanced((authApi) => authApi.login({username: "_camsmember", password})).then(
            () => location.href = "/members-only",
            (err: unknown) => {
                if (Array.isArray(err) && err.length === 1 && err[0].message === "FAILED" && err[0].field === "credentials") {
                    throw new Error("The password was incorrect.");
                } else {
                    throw err;
                }
            }
        ));
    }, [password, wrapLogin, user.authApi]);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/members-only" />;
    }

    return (
        <SitePage title="Members Only">
            <h1 className="text-3xl font-semibold">Members Only</h1>
            <p>You need to log in to access members only content.</p>

            <Form>
                <Control
                    id="login-password"
                    label={defineMessage({ id: "5sg7KC", defaultMessage: "Password" })}
                    hint={defineMessage({
                        defaultMessage:
                            "Enter the current members password. Email us if you are a member but don't have the password.",
                        id: "hz9Kev",
                    })}
                >
                    <TextInput type="password" value={password} onChange={handlePasswordChange} />
                </Control>
                <Button
                    onClick={handleLogin}
                    disabled={password === "" || loginStatus.status === ActionStatus.InProgress ||
                        loginStatus.status === ActionStatus.Success}
                    className="font-bold"
                >
                    <FormattedMessage id="odXlk8" defaultMessage="Log in" />
                </Button>
                <ActionStatusDisplay
                    state={loginStatus}
                    className="my-3"
                    success={
                        <SuccessMessage>
                            <FormattedMessage defaultMessage="You are now logged in." id="Cg184M" />
                        </SuccessMessage>
                    }
                />
            </Form>
        </SitePage>
    );
};

export default MembersLoginPage;
