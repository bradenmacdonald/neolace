import React from "react";
import { FormattedMessage } from "react-intl";
import { ErrorMessage } from "./ErrorMessage";
import { Spinner } from "./Spinner";

export enum ActionStatus {
    Default,
    InProgress,
    Success,
    Error,
}
export interface ActionStatusState {
    status: ActionStatus;
    detailedError?: Error;
}

export function useActionStatus(): [
    ActionStatusState,
    <T>(action: Promise<T>) => Promise<T>,
    (status: ActionStatus, detailedError?: Error) => void,
] {
    const [state, setState] = React.useState<ActionStatusState>({ status: ActionStatus.Default });

    const doAction = React.useCallback(function doAction<T,>(somePromise: Promise<T>): Promise<T> {
        setState({ status: ActionStatus.InProgress });
        somePromise.then(() => {
            setState({ status: ActionStatus.Success });
        }, (err: unknown) => {
            setState({ status: ActionStatus.Error, detailedError: err instanceof Error ? err : undefined });
        });
        return somePromise;
    }, [setState]);

    const setStatus = React.useCallback((newStatus: ActionStatus, detailedError?: Error) => {
        setState({ status: newStatus, detailedError: newStatus === ActionStatus.Error ? detailedError : undefined });
    }, [setState]);

    return [state, doAction, setStatus];
}

interface Props {
    state: ActionStatusState;
    /** What to display on success. Should be a <SuccessMessage /> */
    success: React.ReactElement;
    default?: React.ReactElement;
    inProgress?: React.ReactElement;
    error?: React.ReactElement;
    className?: string;
}

/**
 * Use this for a quick and easy way to display the status of an API call / asyncronous operation in the UI.
 * This will display a loading spinner while the action is happening, and a success message on complete, or an error
 * message on failure.
 */
export const ActionStatusDisplay: React.FunctionComponent<Props> = ({ state, ...props }) => {
    const status = state.status;
    let contents: React.ReactNode;
    if (status === ActionStatus.InProgress) {
        contents = props.inProgress ?? <Spinner />;
    } else if (status === ActionStatus.Success) {
        contents = props.success;
    } else if (status === ActionStatus.Error) {
        contents = props.error ?? (
            <ErrorMessage>
                <FormattedMessage
                    defaultMessage="An error occurred. {details}"
                    id="7KWafa"
                    values={{ details: state.detailedError?.message ?? "" }}
                />
            </ErrorMessage>
        );
    } else {
        contents = props.default ?? null;
    }

    return <div className={props.className}>{contents}</div>;
};
