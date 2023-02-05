import G6, { IShape } from "@antv/g6";
import { api } from "lib/api";
import { NodeType } from "./graph-data";
import { fontSize, height, leftRectWidth, maxTextWidth, radius, textPadding, truncateString, width } from "./graph-g6-node";

/**
 * Always use this node type by importing this string, don't hard-code "placeholder" elsewhere,
 * or else you may forget to import this file and the node won't be registered.
 */
export const placeholderNode = "placeholder";

G6.registerNode(
    NodeType.Placeholder,
    {
        // shapeType: entryNode, // Not sure if this is important or not?
        // Options - specify default options for each node:
        options: {
            style: {
                color: api.EntryTypeColor.Default,
                opacity: 0.4,
            },
            stateStyles: {
                hover: {
                    opacity: 0.8,
                },
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

            const entryCount = cfg.entryCount as number ?? 1;
            // For this node, we draw several entryNode rectangles, each offset by this amount in the x and y direction.
            const offset = height/3;
            const numNodes = Math.min(entryCount, 10);
            const colors = api.getEntryTypeColor({color: cfg.color as api.EntryTypeColor, colorCustom: cfg.colorCustom as string|undefined});

            const totalWidth = width + offset*(numNodes - 1);
            const totalHeight = height + offset*(numNodes - 1);
            const topLeftX = -totalWidth / 2;
            const topLeftY = -totalHeight / 2;

            // Draw an invisible to define the overall shape of this node (affects where edges/relationships connect)
            const keyShape = group.addShape("rect", {
                attrs: {
                    x: topLeftX,
                    y: topLeftY,
                    width: totalWidth,
                    height: totalHeight,
                    radius,
                    fill: "#FFAAAA"
                },
                className: `entryNode-keyShape`,
                name: `entryNode-keyShape`,
                draggable: true,
                visible: false,
            });

            for (let i = 0; i < numNodes; i++) {
                const x = topLeftX + offset*i;
                const y = topLeftY + offset*i;
                const isLastEntry = i === numNodes - 1;

                // Now draw the darker rectangle on the left
                const leftRect = group.addShape("rect", {
                    attrs: {
                        x,
                        y,
                        width: leftRectWidth + radius, // We will use a "clip" to hide the right side of this rectangle so only the left side has rounded edges
                        height,
                        radius,
                        fill: colors.darkerBackgroundColor,
                    },
                    className: `entryNode-leftRect`,
                    name: `entryNode-leftRect`,
                    draggable: true,
                });
                if (isLastEntry) {
                    leftRect.setClip({ type: "rect", attrs: { x, y, width: leftRectWidth, height } });
                } else {
                    leftRect.setClip({ type: "polygon", attrs: { points: [
                        [x,y],
                        [x + leftRectWidth, y],
                        [x + leftRectWidth, y + offset],

                        // [x + offset, y + offset],
                        // Round the corner or else overlapping entries don't look good:
                        [x + offset + radius, y + offset],
                        [x + offset + radius - Math.sin(Math.PI/4)*radius, y + offset + radius - Math.sin(Math.PI/4)*radius],
                        [x + offset, y + offset + radius],

                        [x + offset, y + height],
                        [x, y + height],
                    ] } });
                }

                // Now draw the lighter rectangle on the right
                const rightRect = group.addShape("rect", {
                    attrs: {
                        x: x + leftRectWidth - radius,
                        y,
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
                    attrs: { x: x + leftRectWidth, y, width, height: isLastEntry ? height : offset },
                });
            }

            // Now draw the label of the node (its name)
            const labelText = typeof cfg.label === "string" ? cfg.label : "";
            const labelTextTruncated = truncateString(labelText, maxTextWidth, fontSize);
            group.addShape("text", {
                attrs: {
                    fill: colors.textColor,
                    fontSize,
                    fontFamily: "Inter Var",
                    fontWeight: "bold",
                    x: topLeftX + offset*(numNodes - 1) + leftRectWidth + textPadding,
                    y: topLeftY + offset*(numNodes - 1) + height/2 + 1,
                    text: labelTextTruncated,
                    textBaseline: "middle", // vertically center the text
                },
                className: "entryNode-label",
                name: "entryNode-label",
                draggable: true,
                labelRelated: true, // This doesn't seem important but is in the example code...
            });
            // Now draw the plus sign on the dark rectangle on the left, indicating the type of node.
            group.addShape("text", {
                attrs: {
                    fill: colors.textColor,
                    opacity: 0.2,
                    fontSize,
                    fontFamily: "Inter Var",
                    fontWeight: "bold",
                    x: topLeftX + offset*(numNodes - 1) + (leftRectWidth / 2),
                    y: topLeftY + offset*(numNodes - 1) + height/2 + 1,
                    text: "+",
                    textAlign: "center",
                    textBaseline: "middle", // vertically center the text
                },
                className: "entryNode-typeLabel",
                name: "entryNode-typeLabel",
                draggable: true,
            });

            group.attr("opacity", 0.2);

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
                // Placeholder nodes cannot appear selected.
            } else if (name === "hover" || name === "active") {
                group.attr("opacity", value ? 0.7 : 0.2);
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
