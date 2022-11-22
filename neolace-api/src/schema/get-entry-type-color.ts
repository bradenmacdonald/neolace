import { EntryTypeColor } from "./SiteSchemaData.ts";

const defaultColor = ["#F1F5F9", "#CBD5E1", "#0F172A"] as const; // Default is "Slate" color

const entryTypeColors: Record<
    EntryTypeColor,
    readonly [backgroundColor: string, darkerBackgroundColor: string, textColor: string]
> = Object.freeze({
    // [overall background color, darker left rectangle color, text color]
    // These colors come from https://tailwindcss.com/docs/customizing-colors and are typically the
    // [color-100, color-200, and color-800] variants from that pallete
    [EntryTypeColor.Default]: defaultColor,
    [EntryTypeColor.Custom]: defaultColor,
    [EntryTypeColor.Red]: ["#FECACA", "#FCA5A5", "#991B1B"],
    [EntryTypeColor.Orange]: ["#FFEDD5", "#FED7AA", "#9A3412"],
    [EntryTypeColor.Yellow]: ["#FEF9C3", "#FEF08A", "#A16207"],
    [EntryTypeColor.Lime]: ["#ECFCCB", "#D9F99D", "#3F6212"],
    [EntryTypeColor.Emerald]: ["#D1FAE5", "#A7F3D0", "##065F46"],
    [EntryTypeColor.Teal]: ["#CCFBF1", "#99f6e4", "#115E59"],
    [EntryTypeColor.Cyan]: ["#CFFAFE", "#A5F3FC", "#155E75"],
    [EntryTypeColor.Blue]: ["#DBEAFE", "#BFDBFE", "#3730A3"],
    [EntryTypeColor.Indigo]: ["#E0E7FF", "#C7D2FE", "#3730A3"],
    [EntryTypeColor.Violet]: ["#EDE9FE", "#DDD6FE", "#5B21B6"],
    [EntryTypeColor.Pink]: ["#FCE7F3", "#FBCFE8", "#9D174D"],
    [EntryTypeColor.Rose]: ["#FFE4E6", "#FECDD3", "#9F1239"],
});

export function getEntryTypeColor(
    entryTypeData: { color: EntryTypeColor | undefined; colorCustom?: string } | undefined,
): { backgroundColor: string; darkerBackgroundColor: string; textColor: string } {
    const { color, colorCustom } = entryTypeData ?? {};

    if (color === EntryTypeColor.Custom && colorCustom) {
        // This is a custom color:
        return {
            backgroundColor: "#" + colorCustom.slice(0, 6),
            darkerBackgroundColor: "#" + colorCustom.slice(6, 6 + 6),
            textColor: "#" + colorCustom.slice(12, 12 + 6),
        };
    }

    const data = (color && entryTypeColors[color]) ?? entryTypeColors[EntryTypeColor.Default];
    return {
        backgroundColor: data[0],
        darkerBackgroundColor: data[1],
        textColor: data[2],
    };
}
