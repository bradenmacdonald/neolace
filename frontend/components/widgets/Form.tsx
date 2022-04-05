import React from 'react';
import { FormattedMessage, MessageDescriptor, useIntl } from 'react-intl';


interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    children: React.ReactNode;
}

const doNothing = () => false;

export const Form: React.FunctionComponent<FormProps> = (props) => {
    const intl = useIntl();
    const {children, className, ...formProps} = props;

    return <form className={`block mt-2 ${className ?? ""}`} onSubmit={doNothing} {...formProps}>
        {children}
    </form>;
}


interface ControlProps {
    id: string,
    label: MessageDescriptor,
    hint?: MessageDescriptor,
    children: React.ReactElement;
}

export const Control: React.FunctionComponent<ControlProps> = (props) => {
    const intl = useIntl();

    const childInput = React.cloneElement(props.children, {id: props.id});

    return <div className={`mb-6`}>
        <label htmlFor={props.id} className="block mb-1 text-sm font-semibold text-gray-800">
            <FormattedMessage {...props.label}/>
        </label>
        {childInput}
        {props.hint? <span className="block text-sm text-gray-600"><FormattedMessage {...props.hint}/></span> : null}
    </div>;
}
