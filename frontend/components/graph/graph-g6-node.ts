/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import G6, { IShape } from "@antv/g6";
import { SDK } from "lib/sdk";
import { NodeType } from "./graph-data";

export const width = 220;
export const height = 30;
export const radius = 5; // radius by which the rectangle corners are rounded.
// Width of the darker, inset rectangle on the left
export const leftRectWidth = 30;
export const textPadding = 7; // How much padding is around the text
export const fontSize = 16;
export const maxTextWidth = width - leftRectWidth - (textPadding * 2) - 5; // The 5 is because the text truncation algorithm doesn't work perfectly with our preferred font; with this little fix it always seems good.

G6.registerNode(
    NodeType.Entry,
    {
        // shapeType: entryNode, // Not sure if this is important or not?
        // Options - specify default options for each node:
        options: {
            style: {
                color: SDK.EntryTypeColor.Default,
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
            if (!cfg) throw new Error("no cfg in customized Node.draw()");
            if (!group) throw new Error("no group in customized Node.draw()");

            const colors = SDK.getEntryTypeColor({color: cfg.color as SDK.EntryTypeColor, colorCustom: cfg.colorCustom as string|undefined});

            // Draw the selection rectangle, which forms an outer border when this node is selected.
            // Most of the time (when not selected), it is invisible.
            const selectRectThickness = 2;
            group.addShape("rect", {
                attrs: {
                    opacity: 0, // usually this is hidden.
                    x: -width / 2 - selectRectThickness / 2,
                    y: -height / 2 - selectRectThickness / 2,
                    width: width + selectRectThickness,
                    height: height + selectRectThickness,
                    radius,
                    stroke: colors.textColor,
                    lineWidth: selectRectThickness,
                },
                className: `entryNode-selectRect`,
                name: `entryNode-selectRect`,
                draggable: true,
            });

            // Draw an invisible to define the overall shape of this node (affects where edges/relationships connect)
            const keyShape = group.addShape("rect", {
                attrs: {
                    x: -width / 2,
                    y: -height / 2,
                    width,
                    height,
                    radius,
                },
                className: `entryNode-keyShape`,
                name: `entryNode-keyShape`,
                draggable: true,
                visible: false,
            });

            // Now draw the darker rectangle on the left
            const leftRect = group.addShape("rect", {
                attrs: {
                    x: -width / 2,
                    y: -height / 2,
                    width: leftRectWidth + radius, // We will use a "clip" to hide the right side of this rectangle so only the left side has rounded edges
                    height,
                    radius,
                    fill: colors.darkerBackgroundColor,
                },
                className: `entryNode-leftRect`,
                name: `entryNode-leftRect`,
                draggable: true,
            });
            leftRect.setClip({ type: "rect", attrs: { x: -width / 2, y: -height / 2, width: leftRectWidth, height } });

            // Now draw the lighter rectangle on the right
            const rightRect = group.addShape("rect", {
                attrs: {
                    x: -width / 2 + leftRectWidth - radius,
                    y: -height / 2,
                    width: width - leftRectWidth + radius, // We will use a "clip" to hide the left side of this rectangle so only the right side has rounded edges
                    height,
                    radius,
                    fill: colors.backgroundColor,
                },
                className: `entryNode-rightRect`,
                name: `entryNode-rightRect`,
                draggable: true,
            });
            rightRect.setClip({
                type: "rect",
                attrs: { x: -width / 2 + leftRectWidth, y: -height / 2, width, height },
            });

            // Now draw the label of the node (its name)
            const labelText = typeof cfg.label === "string" ? cfg.label : "";
            const labelTextTruncated = truncateString(labelText, maxTextWidth, fontSize);
            group.addShape("text", {
                attrs: {
                    fill: colors.textColor,
                    fontSize,
                    fontFamily: "Inter Var",
                    fontWeight: "bold",
                    x: -width / 2 + leftRectWidth + textPadding,
                    y: 1, // It looks more centered with y=1 than y=0
                    text: labelTextTruncated,
                    textBaseline: "middle", // vertically center the text
                },
                className: "entryNode-label",
                name: "entryNode-label",
                draggable: true,
                labelRelated: true, // This doesn't seem important but is in the example code...
            });
            // Now draw the letter (or two) on the dark rectangle on the left, indicating the type of node.
            if (cfg.leftLetter) {
                group.addShape("text", {
                    attrs: {
                        fill: colors.textColor,
                        opacity: 0.2,
                        fontSize,
                        fontFamily: "Inter Var",
                        fontWeight: "bold",
                        x: (-width / 2) + (leftRectWidth / 2),
                        y: 1, // It looks more centered with y=1 than y=0
                        text: cfg.leftLetter,
                        textAlign: "center",
                        textBaseline: "middle", // vertically center the text
                    },
                    className: "entryNode-typeLabel",
                    name: "entryNode-typeLabel",
                    draggable: true,
                });
            }

            // Return the keyShape so the graph engine knows the overall size and click area for this node.
            return keyShape;
        },
        /**
         * The extra operations after drawing the node. There is no operation in this function by default
         * @param  {Object} cfg The configurations of the node
         * @param  {G.Group} group Graphics group, the container of the shapes of the node
         */
        afterDraw(_cfg, _group) {},
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
        afterUpdate(_cfg, _node) {},
        /**
         * Should be rewritten when you want to response the state changes by animation.
         * Responsing the state changes by styles can be configured, which is described in the document Middle-Behavior & Event-State
         * @param  {String} name The name of the state
         * @param  {Object} value The value of the state
         * @param  {Node} node The node item
         */
        setState(name, value, item) {
            if (!item) return;
            const baseRect: IShape = item.get("keyShape");
            if (!baseRect || baseRect.destroyed) return;
            const group = item.getContainer();

            if (name === "selected") {
                // When the "select" state changes, toggle the outer border's visibility
                const selectRect = group.find((element) => element.get("name") === "entryNode-selectRect");
                selectRect.attr("opacity", value ? 1 : 0);
            } else if (name === "hover" || name === "active") {
                if (!item.hasState("selected") && !item.hasState("disabled")) {
                    const selectRect = group.find((element) => element.get("name") === "entryNode-selectRect");
                    selectRect.attr("opacity", value ? 0.2 : 0);
                }
            } else if (name === "disabled") {
                // Fade out the whole node.
                group.attr("opacity", value ? 0.3 : 1);
            }
        },
        /**
         * Get the anchorPoints (link points for related edges)
         * @param  {Object} cfg The configuration of the node
         * @return The array of anchorPoints (link points for related edges). Null means there are no anchorPoints
         */
        getAnchorPoints(_cfg) {
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
export function truncateString(str: string, maxWidth: number, fontSize: number): string {
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
}
