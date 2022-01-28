import React from 'react';

export type IconId = 
    | "chevron-up"
    | "chevron-down"
;

interface Props {
    icon: IconId;
}

const iconSvg: Record<Props["icon"], React.ReactFragment> = {
    "chevron-down": <><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></>,
    "chevron-up": <><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></>,
};

export const Icon: React.FunctionComponent<Props> = (props: Props) => {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-[1rem] h-[1rem] inline-block align-[-.125em]" viewBox="0 0 16 16">
        {iconSvg[props.icon]}
    </svg>;
}
