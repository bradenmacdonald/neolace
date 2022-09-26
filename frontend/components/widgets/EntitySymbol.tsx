import { api, useRefCache } from "lib/api";
import { Icon } from "./Icon";

type EntityValue = api.EntryValue | api.PropertyValue | api.EntryTypeValue;

/**
 * A symbol representing an Entry, an Entry Type, or a Property
 */
export const EntitySymbol: React.FunctionComponent<{
    value: EntityValue,
    selected?: boolean,
    className?: string,
    roundedLeftOnly?: boolean,
    defaultBg?: string,
}> = ({ value, selected = false, className = "", roundedLeftOnly = false, defaultBg = "bg-gray-200" }) => {

    const refCache = useRefCache();
    const rounded = roundedLeftOnly ? "rounded-l-md" : "rounded-md";

    if (value.type === "Property") {
        return (
            <span className={`${rounded} py-[3px] px-2 ${defaultBg} text-green-700 ${selected ? '!bg-sky-300 !text-gray-700' : ''} ${className}`}>
                <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="diamond-fill"/></span>
            </span>
        );
    } else if (value.type === "EntryType") {
        const entryTypeColor = refCache.entryTypes[value.id]?.color ?? api.EntryTypeColor.Default;
        return (
            <span className={`${rounded} py-[3px] px-2 ${defaultBg} ${selected ? '!bg-sky-300' : ''} ${className}`} style={{color: api.entryTypeColors[entryTypeColor][2]}}>
                <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="square-fill"/></span>
            </span>
        );
    } else if (value.type === "Entry") {
        const entryTypeData = refCache.entryTypes[refCache.entries[value.id]?.entryType.id];
        const entryTypeColor = api.entryTypeColors[entryTypeData?.color] ?? api.EntryTypeColor.Default;
        return (
            <span
                style={{
                    "--entry-type-color-0": entryTypeColor[0],
                    "--entry-type-color-1": entryTypeColor[1],
                    "--entry-type-color-2": entryTypeColor[2],
                } as React.CSSProperties}
                className={`
                    ${rounded} py-[2px] min-w-[2em] text-center inline-block
                    ${selected ? 'bg-sky-300' : 'bg-entry-type-color-1 text-entry-type-color-2'}
                    ${className}
                `}
            >
                <span className="text-xs inline-block min-w-[1.4em] text-center opacity-40 selection:bg-transparent">{entryTypeData?.abbreviation}</span>
            </span>
        );
    }

    return null;
};
