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
    hint?: string,
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
        {props.hint? <span className="block text-sm text-gray-600">{props.hint}</span> : null}
    </div>;
}

interface AutoControlProps<ValueType> extends ControlProps {
    value: ValueType;
    onChangeFinished?: (newValue: ValueType) => void;
}

/**
 * An auto-control is a control that has its own internal state with the "current" value, and which only notifies
 * the parent's 'onChangeFinished' function when the user 'accepts' the edit by blurring off of the element.
 * @param props 
 * @returns 
 */
export function AutoControl<ValueType>(props: AutoControlProps<ValueType>) {
    // While the user is actively making edits, we track the value in state:
    const [currentValue, setCurrentValue] = React.useState<ValueType>(props.value);
    const [isCurrentlyEditing, setCurrentlyEditing] = React.useState(false);

    React.useEffect(() => {
        // Whenever 'props.value' is changed externally or when we finish editing and blur off, we need to reset our
        // internal "current" value to match the props.value.
        setCurrentValue(props.value);
    }, [props.value, isCurrentlyEditing, setCurrentValue]);

    const handleChange: React.ChangeEventHandler = React.useCallback((eventOrValue: ValueType|React.ChangeEvent) => {
        if (typeof eventOrValue === "object" && (eventOrValue as React.ChangeEvent).target) {
            // deno-lint-ignore no-explicit-any
            setCurrentValue((eventOrValue as React.ChangeEvent<any>).target.value);
        } else {
            setCurrentValue(eventOrValue as ValueType);
        }
    }, [setCurrentValue]);

    const handleFocus: React.ChangeEventHandler = React.useCallback(() => {
        setCurrentlyEditing(true);
    }, [setCurrentlyEditing]);

    const handleBlur: React.ChangeEventHandler = React.useCallback(() => {
        if (props.onChangeFinished && currentValue !== props.value) {
            props.onChangeFinished(currentValue);
        }
        setCurrentlyEditing(false);
    }, [props.onChangeFinished, currentValue, setCurrentlyEditing]);

    const childInput = React.cloneElement(props.children, {
        value: isCurrentlyEditing ? currentValue : props.value,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
    });

    return <Control id={props.id} label={props.label} hint={props.hint}>
        {childInput}
    </Control>;
}
