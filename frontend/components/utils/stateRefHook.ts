import React from "react";

/**
 * React hook to create a state variable that is accessed by reference.
 * The main advantage is that you can read the "true" value of the current state at any time from a callback, even in
 * the same event cycle as an update to the value.
 * 
 * e.g. without this, if a control calls onChange and then onBlur as part of the same event, the onBlur event handler
 * may have an old version of the value because even though the onChange handler has updated the state, the onBlur still
 * has bound an older version of the value, until the component is re-rendered by React.
 */
export function useStateRef<ValueType>(initialValue: ValueType): readonly [ValueType, React.Dispatch<React.SetStateAction<ValueType>>, React.MutableRefObject<ValueType>] {
    const [value, innerSetValue] = React.useState<ValueType>(initialValue);
  
    const ref = React.useRef(value);
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setValue: React.Dispatch<React.SetStateAction<ValueType>> = React.useCallback((newValue: any) => {
        if (typeof newValue === "function") {
            const oldValue = ref.current;
            newValue = newValue(oldValue);
        }
        innerSetValue(newValue);
        ref.current = newValue;
    }, []);

    return [value, setValue, ref] as const;
}
