import dynamic from "next/dynamic";
import { PluginDefinition } from "components/utils/ui-plugins"
import { UiChangeOperation } from "components/widgets/UISlot";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MembersOnlyNotice = dynamic<any>(() => import(`./plugin-components/MembersOnlyNotice`).then(mod => mod.MembersOnlyNotice));

export const plugin: PluginDefinition = {
    id: "cams",
    getPageForPath(_site, path) {
        if (path === "/members-only") {
            return "members-only";
        } else  if (path === "/members-login") {
            return "members-login";
        }
        return undefined;
    },
    getUiSlotChanges() {
        return {
            "leftNavBottom": [
                // Hide the normal system links, because we don't want users clicking "login" and going to the realm home site:
                {
                    op: UiChangeOperation.Hide,
                    widgetId: "systemLinks",
                },
            ],
            "globalHeader": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "cams-header",
                        priority: 1,
                        content: <>
                            <div className="fixed w-full z-[2] bg-black h-[72px]">
                                <div className="max-w-[1080px] mx-auto h-full">
                                    <a href="https://cams.mit.edu/">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            className="h-full mx-[4px]"
                                            alt="MIT CAMS"
                                            src="https://cams.mit.edu/wp-content/uploads/CAMSlogo_Sloanlogo-2.png"
                                        />
                                    </a>
                                </div>
                            </div>
                        </>
                    },
                }
            ],
            "siteLogo": [
                {
                    op: UiChangeOperation.Insert,
                    widget: { id: "cams-header-spacer", priority: 1, content: <div className="h-[72px]"></div> },
                }
            ],
            "preContent": [
                {
                    op: UiChangeOperation.Insert,
                    widget: { id: "cams-header-spacer", priority: 1, content: <div className="h-[72px]"></div> },
                }
            ],
            "entryPreFeature": [
                {
                    op: UiChangeOperation.Insert,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    widget: { id: "cams-members-only-notice", priority: 10, content: <MembersOnlyNotice /> },
                },
            ],
        };
    },
};
