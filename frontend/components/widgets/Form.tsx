import React from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { displayText, TranslatableText } from "components/utils/i18n";
import { useStateRef } from "components/utils/stateRefHook";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    children: React.ReactNode;
}

const doNothing = () => false;

export const Form: React.FunctionComponent<FormProps> = (props) => {
    const intl = useIntl();
    const { children, className, ...formProps } = props;

    return (
        <form className={`block mt-2 ${className ?? ""}`} onSubmit={doNothing} {...formProps}>
            {children}
        </form>
    );
};

interface ControlProps {
    id: string;
    label: TranslatableText;
    hint?: TranslatableText;
    children: React.ReactElement;
    /** Extra HTML/elements associated with this control, but not related to the main input itself */
    afterInput?: React.ReactNode;
    /** Is this field required? */
    isRequired?: boolean;
}

export const Control: React.FunctionComponent<ControlProps> = (props) => {
    const intl = useIntl();

    const childInput = React.cloneElement(props.children, { id: props.id });
    const hasValue = childInput.props.value !== "" && childInput.props.value !== undefined;

    return (
        <div className={`mb-6`}>
            <label htmlFor={props.id} className="block w-max mb-1 text-sm font-semibold">
                {displayText(props.label)}
                {props.isRequired && (
                    <span
                        className={`text-xs p-1 mx-2 rounded-md  font-light ${
                            hasValue ? "text-gray-400" : "bg-amber-100 text-gray-800"
                        }`}
                    >
                        <FormattedMessage defaultMessage="Required" id="Seanpx" />
                    </span>
                )}
            </label>
            {props.afterInput ?
                <div className="flex flex-row">
                    {childInput}
                    {props.afterInput}
                </div>
            : childInput}
            {props.hint ? <span className="block text-sm text-gray-600">{displayText(props.hint)}</span> : null}
        </div>
    );
};

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
    const [currentValue, setCurrentValue, currentValueRef] = useStateRef<ValueType>(props.value);
    const [isCurrentlyEditing, setCurrentlyEditing] = React.useState(false);

    React.useEffect(() => {
        // Whenever 'props.value' is changed externally or when we finish editing and blur off, we need to reset our
        // internal "current" value to match the props.value.
        setCurrentValue(props.value);
    }, [props.value, isCurrentlyEditing, setCurrentValue]);

    const handleChange: React.ChangeEventHandler = React.useCallback((eventOrValue: ValueType | React.ChangeEvent) => {
        if (typeof eventOrValue === "object" && (eventOrValue as React.ChangeEvent).target) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCurrentValue((eventOrValue as React.ChangeEvent<any>).target.value);
        } else {
            setCurrentValue(eventOrValue as ValueType);
        }
    }, [setCurrentValue]); // eslint doesn't know that 'setCurrentValue' will never change, so we include it here.

    const handleFocus: React.ChangeEventHandler = React.useCallback(() => {
        setCurrentlyEditing(true);
    }, []);

    const { value, onChangeFinished, ...controlProps } = props;
    const handleBlur: React.ChangeEventHandler = React.useCallback(() => {
        const currentValueActual = currentValueRef.current;
        if (onChangeFinished && currentValueActual !== value) {
            onChangeFinished(currentValueActual);
        }
        setCurrentlyEditing(false);
    }, [value, onChangeFinished, currentValueRef]);

    const childInput = React.cloneElement(props.children, {
        value: isCurrentlyEditing ? currentValue : props.value,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
    });

    return (
        <Control {...controlProps}>
            {childInput}
        </Control>
    );
}
