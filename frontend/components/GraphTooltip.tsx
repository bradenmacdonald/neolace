/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import G6 from "@antv/g6";
import ReactDOM from "react-dom";
import { InlineMDT, MDTContext } from "./markdown-mdt/mdt";

export class GraphTooltip extends G6.Tooltip {
    constructor(mdtContext: React.RefObject<MDTContext>) {
        super({
            offsetX: 10,
            offsetY: 10,
            // v4.2.1 起支持配置 trigger，click 代表点击后出现 tooltip。默认为 mouseenter
            trigger: "click",
            // the types of items that allow the tooltip show up
            // 允许出现 tooltip 的 item 类型
            itemTypes: ["node"], // TODO: add for edges
            // custom the tooltip's content
            // 自定义 tooltip 内容
            getContent: (e) => {
                const refCache = mdtContext.current?.refCache;
                const outDiv = document.createElement("div");
                // const root = ReactDOM.createRoot(outDiv); //for React 18
                if (!e || !e.item || !refCache) {
                    return outDiv;
                }
                const node = e.item.getModel();
                const entry = refCache.entries[node.id!]; // we know that the nodes will have id
                ReactDOM.render(
                    <>
                        <strong>
                            {/* <Link href={`/entry/${node.id}`}> */}
                                <a href={`/entry/${node.id}`}>{node.label}</a>
                            {/* </Link> */}
                        </strong>{' '}
                        ({refCache.entryTypes[entry.entryType.id]?.name})<br />
                        <p className="text-sm">
                            {/* <InlineMDT
                                mdt={entry.description}
                                context={mdtContext.childContextWith({ entryId: entry.id })}
                            /> */}
                        </p>
                    </>,
                    outDiv,
                );
                outDiv.style.width = "fit-content";
                return outDiv;
            }
        });
    }
}

