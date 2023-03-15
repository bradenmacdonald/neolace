/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license All Rights reserved.
 */
import { Portal } from "components/utils/Portal";
import { Icon } from "components/widgets/Icon";
import React from "react";

type Props = Record<never, never>;

export const HeaderNavModal: React.FunctionComponent<Props> = (props) => {

    const [isMenuOpen, setMenuOpen] = React.useState(false);
    const showMenu = React.useCallback(() => setMenuOpen(true), []);
    const hideMenu = React.useCallback(() => setMenuOpen(false), []);

    const checkForEscapeKey = React.useCallback((event: KeyboardEvent) => {
        if (event.key === "Escape") { setMenuOpen(false); }
    }, []);

    React.useEffect(() => {
        document.addEventListener("keydown", checkForEscapeKey);
        return () => { // Unbind the event listener on clean up
            document.removeEventListener("keydown", checkForEscapeKey);
        };
    }, [checkForEscapeKey]);

    return <>
        {/* The "hamburger" link button that will reveal the navigation menu */}
        <button className="text-white text-sm pt-2 block" onClick={showMenu}>
            <span className="text-4xl block"><Icon icon="list" /></span>
            Menu
        </button>

        <Portal>
            <div
                className={`
                    ${isMenuOpen ? "visible opacity-95" : "invisible opacity-0"}
                    fixed left-0 top-0 right-0 bottom-0
                    bg-[#0a485f]
                    text-white font-[Arial,Helvetica,Arial,Lucida,sans-serif] tracking-[2px] text-[30px]
                    z-50
                `}
                style={{transition: "visibility 1s linear,opacity 1s ease-in-out"}}
            >
                {/* The close button */}
                <button
                    className="text-white text-sm pt-2 block text-[18px] tracking-[2px] float-right absolute right-[30px] top-[34px]"
                    onClick={hideMenu}
                >
                    <span className="text-4xl block"><Icon icon="x-lg" /></span>
                    Menu
                </button>    
                {/* The navigation menu, matching the one on the main CAMS site */}
                <div className="table w-full h-full">
                    <ul id="mobile_menu_slide" className="table-cell text-center align-middle w-full h-full [&_a:hover]:opacity-70">
                        <li><a href="https://cams.mit.edu/" aria-current="page">Home</a></li>
                        <li><a href="https://cams.mit.edu/about/">About Us<span className=""></span></a>
                        <ul className="">
                            <li><a href="https://cams.mit.edu/about/">About</a></li>
                            <li><a href="https://cams.mit.edu/people/">People</a></li>
                            <li><a href="https://cams.mit.edu//wp-content/uploads/Members.pdf">Members</a></li>
                            <li><a href="/" aria-current="page" className="text-[#a41e36]">Research</a></li>
                            <li><a href="https://cams.mit.edu/in-the-press/">In The Press</a></li>
                            <li><a href="https://cams.mit.edu/events/">Events</a></li>
                            <li><a href="https://cams.mit.edu/newsletters/">Newsletters</a></li>
                        </ul>
                        </li>
                        <li><a href="https://cams.mit.edu/join-us/">Join Us</a></li>
                        <li><a href="https://cams.mit.edu/ccis/">CCIS</a></li>
                        <li><a href="https://cams.mit.edu/contact-us/">Contact Us</a></li>
                        <li><a href="/members-only">Members Login</a></li>
                    </ul>
                </div>
            </div>
        </Portal>
    </>;
};
