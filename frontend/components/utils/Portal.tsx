import React from 'react';
import ReactDOM from 'react-dom';

interface Props {
    className?: string;
    el?: string;
    children: React.ReactNode;
}

/**
 * Use a React portal to render elements at the end of the <body>. Based on https://stackoverflow.com/a/59154364
 * @param children Child elements
 * @param className CSS classname
 * @param el HTML element to create.  default: div
 */
export const Portal : React.FC<Props> = ( { children, className = 'fixed root-portal top-0 left-0 w-full z-modal', el = 'div' } ) => {

    const [container, setContainer] = React.useState<HTMLElement|null>(null);

    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const portals: Record<string, {element: HTMLElement, usageCount: number}> = (window as any)._portals || ((window as any)._portals = {});
        const portalKey = el + ":" + className;
        if (portals[portalKey] === undefined) {
            portals[portalKey] = {element: document.createElement(el), usageCount: 1};
            document.body.appendChild(portals[portalKey].element);
            portals[portalKey].element.className = className;
        } else {
            portals[portalKey].usageCount++;
        }
        setContainer(portals[portalKey].element);
        // Cleanup function: remove the element:
        return () => {
            if (portals[portalKey].usageCount-- <= 0) {
                document.body.removeChild(portals[portalKey].element);
            }
        }
    }, [])

    return container ? ReactDOM.createPortal(children, container) : null;
}
