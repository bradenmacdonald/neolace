import React from "react";

import { displayText, TranslatableText } from "components/utils/i18n";
import { Icon, IconId } from "../widgets/Icon";
import { useClickOutsideHandler } from "components/utils/events";

export interface SelectOption {
    id: string;
    label: TranslatableText;
    icon?: IconId;
}

interface Props {
    options: SelectOption[];
    className?: string;
    value?: string;
    readOnly?: boolean;
    onChange?: (newSelectedItem: string) => void;
    renderOption?: (option: SelectOption) => { classNameList: string; classNameButton: string; node: React.ReactNode };
}

function defaultRender(option: SelectOption) {
    return {
        classNameList: "",
        classNameButton: "",
        node: (
            <>
                {option.icon ? <><Icon icon={option.icon} />{" "}</> : null}
                {displayText(option.label)}
            </>
        ),
    };
}

/**
 * Our version of a <select> element.
 */
export const SelectBox: React.FunctionComponent<Props> = ({ onChange, options, value: selectedItem, ...props }) => {
    const [isMenuVisible, setMenuVisible] = React.useState(false);
    const outerDiv = React.useRef<HTMLDivElement>(null);

    // When the user clicks on this, show or hide the menu:
    const handleButtonClick = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setMenuVisible((current) => !current && !props.readOnly);
    }, [props.readOnly]);

    // If the menu is open, hide it when the user clicks outside of the menu or presses escape:
    const handleHideMenu = React.useCallback((event: KeyboardEvent | MouseEvent) => {
        if (isMenuVisible) event.preventDefault();
        setMenuVisible(false);
    }, [isMenuVisible]);
    useClickOutsideHandler(outerDiv, handleHideMenu);
    // useKeyHandler("Escape", handleHideMenu);

    // Handle when the user clicks on an option to select it
    const handleItemClick = React.useCallback((event: React.MouseEvent<HTMLLIElement>) => {
        const id = event.currentTarget.getAttribute("id");
        if (onChange && id) onChange(id);
        setMenuVisible(false);
    }, [onChange]);

    // Handle keyboard events on the menu itself, while it's open:
    const handleListKeyPress = React.useCallback((event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            setMenuVisible(false);
        } else if (event.key === "ArrowDown" && options.length > 0 && onChange) {
            event.preventDefault();
            const currentIndex = options.findIndex((opt) => opt.id === selectedItem);
            const newIndex = (currentIndex + 1) % options.length;
            onChange(options[newIndex].id);
        } else if (event.key === "ArrowUp" && options.length > 0 && onChange) {
            event.preventDefault();
            const currentIndex = options.findIndex((opt) => opt.id === selectedItem);
            const newIndex = (currentIndex - 1 + options.length) % options.length;
            onChange(options[newIndex].id);
        }
    }, [options, selectedItem, onChange]);

    // Handle keyboard events on an individual item that has keyboard focus, while the menu is open:
    const handleItemKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLLIElement>) => {
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.click();
        }
    }, []);

    const renderOption = props.renderOption ?? defaultRender;
    const selectedOption = options.find((opt) => opt.id === selectedItem);
    const { classNameButton, node: buttonContent } = selectedOption
        ? renderOption(selectedOption)
        : { classNameButton: "", node: "" };

    return (
        <div className={`relative max-w-full ${props.className ?? "w-[600px]"}`} ref={outerDiv}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isMenuVisible}
                className={`
                    w-full flex cursor-default border border-gray-500 rounded-md px-2 py-1 m-[3px] align-top
                    group
                    hover:shadow-sm hover:shadow-theme-link-color
                    active:shadow-none active:ml-[4px] active:mt-[4px] active:mr-[2px] active:mb-[2px] 
                    disabled:text-gray-400 disabled:border-gray-300 disabled:hover:shadow-none disabled:cursor-not-allowed
                    ${classNameButton}
                `}
                onClick={handleButtonClick}
                onKeyDown={handleListKeyPress}
                disabled={props.readOnly}
            >
                <span className="flex-1 text-left">{buttonContent}</span>
                <span className="text-gray-700 inline-block ml-2 flex-none group-hover:text-sky-700 group-disabled:!text-inherit">
                    <Icon icon="chevron-expand" />
                </span>
            </button>
            <ul
                className={`
                    unstyled absolute -mt-[5px] mx-[3px] w-full ${isMenuVisible ? "block" : "hidden"}
                    max-h-64 overflow-auto
                    rounded-md bg-white border border-gray-500 shadow-lg
                    z-widget
                `}
                role="listbox"
                aria-activedescendant={selectedItem}
                tabIndex={-1}
                onKeyDown={handleListKeyPress}
            >
                {options.map((item) => {
                    const { classNameList, node } = renderOption(item);
                    return (
                        <li
                            key={item.id}
                            id={item.id}
                            role="option"
                            aria-selected={item.id === selectedItem}
                            tabIndex={0}
                            onKeyDown={handleItemKeyDown}
                            onClick={handleItemClick}
                            className={`
                                px-2 py-1
                                first:rounded-t-md last:rounded-b-md cursor-default
                                ${item.id === selectedItem ? "bg-sky-300" : "hover:bg-sky-100"}
                                ${classNameList}
                            `}
                        >
                            {node}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
