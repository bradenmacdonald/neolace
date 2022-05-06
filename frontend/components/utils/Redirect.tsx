import React from 'react';
import Router from 'next/router';

export const Redirect: React.FunctionComponent<{to: string, replace?: boolean, children?: React.ReactNode}> = function(props) {
    // When this components first renders, tell the Router to redirect.
    React.useEffect(() => {
        if (props.replace) {
            Router.replace(props.to);
        } else {
            Router.push(props.to);
        }
    }, [props.to, props.replace]);
    return <>{props.children}</>;
}
