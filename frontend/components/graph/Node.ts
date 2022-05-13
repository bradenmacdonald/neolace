import G6, { Graph, GraphOptions, IG6GraphEvent, NodeConfig } from "@antv/g6";

/**
 * Always use this node type by importing this string, don't hard-code "entryNode" elsewhere,
 * or else you may forget to import this file and the node won't be registered.
 */
export const entryNode = "entryNode";

export enum EntryColor {
    Blue = "blue",
    Emerald = "emerald",
    Cyan = "cyan",
    Orange = "orange",
    Violet = "violet",
    Red = "red",
}

const colorSets: Record<EntryColor, [backgroundColor: string, darkerBackgroundColor: string, textColor: string]> = {
    // [overall background color, darker left rectangle color, text color]
    // These colors come from https://tailwindcss.com/docs/customizing-colors and are typically the
    // [color-100, color-200, and color-800] variants from that pallete
    [EntryColor.Red]: ["#FECACA", "#FCA5A5", "#991B1B"],
    [EntryColor.Orange]: ["#FFEDD5", "#FED7AA", "#9A3412"],
    [EntryColor.Emerald]: ["#D1FAE5", "#A7F3D0", "##065F46"],
    [EntryColor.Cyan]: ["#CFFAFE", "#A5F3FC", "#155E75"],
    [EntryColor.Blue]: ["#DBEAFE", "#BFDBFE", "#3730A3"],
    [EntryColor.Violet]: ["#EDE9FE", "#DDD6FE", "#5B21B6"],
};

G6.registerNode(
    entryNode,
    {
        // shapeType: entryNode, // Not sure if this is important or not?
        // Options - specify default options for each node:
        options: {
            style: {
                color: EntryColor.Red,
            },
            stateStyles: {
                hover: {},
                selected: {},
            },
        },
        /**
         * Draw the node with label
         * @param  {Object} cfg The configurations of the node
         * @param  {G.Group} group Graphics group, the container of the shapes of the node
         * @return {G.Shape} The keyShape of the node. It can be obtained by node.get('keyShape')
         */
        draw(cfg, group) {
            if (!cfg) { throw new Error("no cfg in customized Node.draw()"); }
            if (!group) { throw new Error("no group in customized Node.draw()"); }
            const width = 220;
            const height = 30;
            const radius = 5; // radius by which the rectangle corners are rounded.
            // Width of the darker, inset rectangle on the left
            const leftRectWidth = 30;
            const textPadding = 7; // How much padding is around the text
            const fontSize = 16;
            const maxTextWidth = width - leftRectWidth - (textPadding * 2) - 5;  // The 5 is because the text truncation algorithm doesn't work perfectly with our preferred font; with this little fix it always seems good.

            const [bgColor, darkColor, textColor] = (cfg.color && cfg.color in colorSets) ? colorSets[cfg.color as EntryColor] : colorSets[EntryColor.Red];

            // Draw the base rectangle:
            const keyShape = group.addShape('rect', {
                attrs: {
                    x: -width / 2,
                    y: -height / 2,
                    width,
                    height,
                    radius,
                    fill: bgColor,
                },
                // className: `${this.type}-keyShape`,
                name: `entryNode-keyShape`,
                draggable: true,
            });

            // Now draw the darker rectangle on the left
            group.addShape('rect', {
                attrs: {
                    x: -width / 2,
                    y: -height / 2,
                    width: leftRectWidth,
                    height,
                    radius,
                    fill: darkColor,
                },
                // className: `${this.type}-keyShape`,
                name: `entryNode-keyShape`,
                draggable: true,
            });
            // But we want the right side of the darker rectangle to be flat, not a rounded border, so we fake it:
            group.addShape('rect', {
                attrs: {
                    x: -width / 2 + radius,
                    y: -height / 2,
                    width: leftRectWidth - radius,
                    height,
                    radius: 0,
                    fill: darkColor,
                },
                className: `entryNode-keyShape`,
                name: `entryNode-keyShape`,
                draggable: true,
            });

            // Now draw the label of the node (its name)
            const labelText = typeof cfg.label === "string" ? cfg.label : "";
            const labelTextTruncated = truncateString(labelText, maxTextWidth, fontSize);
            group.addShape('text', {
                attrs: {
                    fill: textColor,
                    fontSize,
                    fontFamily: "Inter Var",
                    fontWeight: "bold",
                    x: -width / 2 + leftRectWidth + textPadding,
                    y: 0,
                    text: labelTextTruncated,
                    textBaseline: "middle",  // vertically center the text
                },
                className: 'entryNode-label',
                name: 'entryNode-label',
                draggable: true,
                labelRelated: true,  // This doesn't seem important but is in the example code...
            });

            // Return the keyShape so the graph engine knows the overall size and click area for this node.
            return keyShape;
        },
        /**
         * The extra operations after drawing the node. There is no operation in this function by default
         * @param  {Object} cfg The configurations of the node
         * @param  {G.Group} group Graphics group, the container of the shapes of the node
         */
        afterDraw(cfg, group) {},
        /**
         * Update the node and its label
         * @override
         * @param  {Object} cfg The configurations of the node
         * @param  {Node} node The node item
         */
        update: undefined, // Don't call the base class update; call draw() instead.
        // update(cfg, node) {
        //     console.log("Update ", cfg, node);
        // },
        /**
         * The operations after updating the node. It is combined with afterDraw generally
         * @override
         * @param  {Object} cfg The configurations of the node
         * @param  {Node} node The node item
         */
        afterUpdate(cfg, node) {},
        /**
         * Should be rewritten when you want to response the state changes by animation.
         * Responsing the state changes by styles can be configured, which is described in the document Middle-Behavior & Event-State
         * @param  {String} name The name of the state
         * @param  {Object} value The value of the state
         * @param  {Node} node The node item
         */
        setState(name, value, node) {},
        /**
         * Get the anchorPoints (link points for related edges)
         * @param  {Object} cfg The configuration of the node
         * @return The array of anchorPoints (link points for related edges). Null means there are no anchorPoints
         */
        getAnchorPoints(cfg) {
            // We don't specify any anchor points, and that way the whole outer rectangle (keyShape) is used, which
            // means edges can point to or leave from anywhere along the border of the outer rectangle, which is exactly
            // what we want.
            return undefined;
        },
    },
    // We are extending the base class for 'single-node' type:
    "single-node",
);

/**
 * Shorten a string and add an ellipsis as needed so that the string fits the maximum width specified.
 * Unfortunately this doesn't take the font into account so it's only perfectly accurate for G6's default font.
 */
function truncateString(str: string, maxWidth: number, fontSize: number): string {
    const ellipsis = "…";
    const ellipsisLength = G6.Util.getTextSize(ellipsis, fontSize)[0];
    let currentWidth = 0;
    let res = str;
    const pattern = new RegExp("[\u4E00-\u9FA5]+"); // distinguish the Chinese charactors and letters
    str.split("").forEach((letter, i) => {
        if (currentWidth > maxWidth - ellipsisLength) return;
        if (pattern.test(letter)) {
            // Chinese charactors
            currentWidth += fontSize;
        } else {
            // get the width of single letter according to the fontSize
            currentWidth += G6.Util.getLetterWidth(letter, fontSize);
        }
        if (currentWidth > maxWidth - ellipsisLength) {
            res = `${str.substring(0, i)}${ellipsis}`;
        }
    });
    return res;
};
