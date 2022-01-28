import React from 'react';

export type IconId = 
    | "chevron-up"
    | "chevron-down"
    | "search"
;

interface Props {
    icon: IconId;
}

const iconSvg: Record<Props["icon"], React.ReactFragment> = {
    "chevron-down": <><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></>,
    "chevron-up": <><path fill-rule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></>,
    "search": <><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></>,
};

export const Icon: React.FunctionComponent<Props> = (props: Props) => {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-[1rem] h-[1rem] inline-block align-[-.125em]" viewBox="0 0 16 16">
        {iconSvg[props.icon]}
    </svg>;
}
