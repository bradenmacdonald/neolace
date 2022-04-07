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

interface AutoControlProps<ValueType> extends ControlProps {
    initialValue: ValueType;
    onChange?: (newValue?: ValueType) => void;
}

/**
 * An auto-control is a control that has its own internal state with the "current" value, and which only notifies
 * the parent's 'onChange' function when the user 'accepts' the edit by blurring off of the element.
 * @param props 
 * @returns 
 */
export function AutoControl<ValueType>(props: AutoControlProps<ValueType>) {
    const [currentValue, setCurrentValue] = React.useState<ValueType>(props.initialValue);
    React.useEffect(() => {
        // If the initial value changes, override the current value
        setCurrentValue(props.initialValue);
    }, [props.initialValue])

    // deno-lint-ignore no-explicit-any
    const handleChange: React.ChangeEventHandler = React.useCallback((eventOrValue: ValueType|React.ChangeEvent) => {
        if (typeof eventOrValue === "object" && (eventOrValue as React.ChangeEvent).target) {
            setCurrentValue((eventOrValue as React.ChangeEvent<any>).target.value);
        } else {
            setCurrentValue(eventOrValue as ValueType);
        }
    }, [setCurrentValue]);

    const childInput = React.cloneElement(props.children, {value: currentValue, onChange: handleChange});

    return <Control id={props.id} label={props.label} hint={props.hint}>
        {childInput}
    </Control>
}
