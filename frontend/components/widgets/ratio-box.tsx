import React from 'react';

interface Props {
    ratio: number|undefined;
    children: React.ReactNode;
}

/**
 * Display a rectangle that fits to width of its parent element but maintains its height
 * proportional to some ratio
 */
export const RatioBox: React.FunctionComponent<Props> = (props) => {
    
    if (props.ratio === undefined || Number.isNaN(props.ratio)) {
        return <div>
            {props.children}
        </div>
    }

    return <div className="relative h-0" style={{paddingBottom: `${100.0/props.ratio}%`}}>
        <div className="absolute top-0 left-0 w-full h-full">
            {props.children}
        </div>
    </div>
};
