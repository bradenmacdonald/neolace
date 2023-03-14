/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";

/**
 * Use this to get/set the current zIndex of the React tree. Used to ensure that widget tooltips in modals have higher
 * z-index that tooltips outside the modal, for example.
 */
 export const ZIndexContext = React.createContext<number>(0); // default zIndex is 0

export enum IncreaseZIndex {
    NoChange = 0,
    ForDropdown = 1,
    ForTooltip = 5,
    ForPanel = 5,
    ForModal = 10,
    ForMobileMenu = 50,
}

/**
 * Get the "current" z-index at this point in the React tree. Used to correctly ensure that dropdowns, tooltips, and
 * modals have the correct z-index.
 */
export function useZIndex(options: {increaseBy?: IncreaseZIndex} = {}): number {
    const zIndex = React.useContext(ZIndexContext);
    return zIndex + (options.increaseBy ?? 0);
}
