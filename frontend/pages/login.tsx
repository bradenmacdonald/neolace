import React from 'react';
import { NextPage } from 'next'
import Router from 'next/router';

import { Page } from 'components/Page';
import { UserContext, UserStatus, requestPasswordlessLogin } from 'components/user/UserContext';

const LoginPage: NextPage = function() {

    const user = React.useContext(UserContext);

    // If the user is already logged in, redirect them to the homepage.
    React.useEffect(() => { 
        if (user.status === UserStatus.LoggedIn) {
            Router.push('/');
        }  
    }, [user.status]);

    const [userEmail, setUserEmail] = React.useState("");
    const userEmailChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUserEmail(event.target.value);
    }, []);

    // Handler for when user enters their email and clicks "log in"
    const handleLogin = React.useCallback(async (event: React.MouseEvent) => {
        event.preventDefault();
        if (await requestPasswordlessLogin(userEmail)) {
            alert("A link was emailed to you; just click it an you'll be logged in.");
        } else {
            alert("You don't have an account. Please register first.");
        }
    }, [userEmail]);



    if (user.status === UserStatus.LoggedIn) {
        return <>Redirecting you to the home page...</>;
    }

    return (
        <Page
            title="Log in to TechNotes"
        >
            <h1>Log in to TechNotes</h1>

            <p>Account registration is not available yet. If you already have an account though, you can log in here.</p>

            <form>
                <div className="form-group">
                    <label htmlFor="tn-login-email">Email address</label>
                    <input value={userEmail} onChange={userEmailChange} type="email" className="form-control" id="tn-login-email" aria-describedby="tn-login-email-help"/>
                    <small id="tn-login-email-help" className="form-text text-muted">We'll email you a link. Just click it and you'll be logged in!</small>
                </div>
                <button type="submit" className="btn btn-primary" onClick={handleLogin} disabled={userEmail === ""}>Log me in</button>
            </form>
        </Page>
    );
}

export default LoginPage;
