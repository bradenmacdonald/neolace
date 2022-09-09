import React from "react";
import { useStateRef } from "components/hooks/useStateRef";
import { Control, ControlProps } from "./Control";


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
