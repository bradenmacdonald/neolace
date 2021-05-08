import { VNodeData } from "./common";

export interface ImageData extends VNodeData {
    name: string;
    description: string;
    imageType: "photo"|"screenshot"|"chart"|"drawing";
    imageUrl: string;
}

export interface ImageReferenceData extends Pick<VNodeData, "slugId"> {
    description: string;
    imageUrl: string;
}
