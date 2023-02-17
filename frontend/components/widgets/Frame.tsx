import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

/**
 * A Frame is basically a rectangle in our UI.
 * It has no internal padding; use <FrameBody> for that.
 */
export const Frame: React.FunctionComponent<Props> = ({ className, children, ...props }) => {
    return (
        <div
            // This <Frame> has a rounded border.
            // overflow-hidden makes sure the inner content is clipped at the rounded corners.
            // The neo-frame-body selectors make this look way better when a <Frame> is used
            // inside of another <Frame> (well, inside another <FrameBody>).
            className={`
                flex flex-col
                rounded-lg border border-slate-300 w-auto max-w-full
                overflow-hidden
                [.neo-frame-body>&]:-m-2
                [.neo-frame-body>&]:max-w-[calc(100%+1rem)]
                [.neo-frame-body>&]:rounded-none
                [.neo-frame-body>&]:border-none
                ${className ?? ""}
            `}
            {...props}
        >
            {children}
        </div>
    );
};


/**
 * A toolbar or other widget with a grey background, at the top of a frame.
 */
export const FrameHeader: React.FunctionComponent<Props> = ({ className, children, ...props }) => {
    return (
        <div
            className={`
                block w-full border-b-[1px] border-slate-300 bg-gray-100 p-1
                ${className ?? ""}
            `}
            {...props}
        >
            {children}
        </div>
    );
};



/**
 * A wrapper around the content of the frame. Goes below the <FrameHeader> if there is one.
 */
export const FrameBody: React.FunctionComponent<Props> = React.forwardRef<HTMLDivElement, Props>(
    function FrameBody({ className, children, ...props }, ref) {
        return (
            <div
                ref={ref}
                className={`
                    block p-2
                    neo-frame-body
                    ${className ?? ""}
                `}
                {...props}
            >
                {children}
            </div>
        );
    }
);
