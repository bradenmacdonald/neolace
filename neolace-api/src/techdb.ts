import { VNodeData } from "./common";
import { ImageReferenceData } from "./assetlib";

export enum TechDbEntryType {
    TechConcept = "TechConcept",
    Process = "Process",
    Design = "Design",
}

/** XFlag is not actually used, but helps us write typescript checks for when flags are specified exactly or not. */
export type XFlag = "x";

export type TechDbEntryFlags = "relatedImages" | "numRelatedImages" | XFlag;
export const TechDbEntryFlags = {
    relatedImages: "relatedImages" as const,
    numRelatedImages: "numRelatedImages" as const,
}

export interface TechDbEntryData extends VNodeData {
    name: string;
    /** Rich text (MDT) description of this entry */
    description: string;
    entryType: TechDbEntryType;
    relatedImages?: {
        shortId: string;
        uuid: string;
        name: string;
        description: string;
        imageUrl: string;
    }[];
    numRelatedImages?: number;
}

export type TechDbEntryReferenceData = Omit<TechDbEntryData, "relatedImages"|"numRelatedImages">;

interface ArticleSection {
    title: string;
    code: string;
    content: string;
}

export interface TechConceptData extends TechDbEntryData {
    altNames: Array<string>;
    /** Technology Readiness Level: "1" to "9" (or "X1" to "X9" for obsolete/abandoned) */
    readinessLevel: string|null;
    isA: Array<TechConceptReferenceData>;
    types: Array<TechConceptReferenceData>;
    usedIn: Array<TechConceptReferenceData>;
    heroImage: ImageReferenceData|null;
    articleSections: Array<ArticleSection>;
    wikiquivalent: string|null;
    designs: Array<DesignReferenceData>;
}

/** A minimal subset of information, used when listing a bunch of TechConcepts */
export type TechConceptReferenceData = Pick<TechConceptData, "uuid"|"shortId"|"name"|"description"|"readinessLevel">


export interface ProcessData extends TechDbEntryData {
    altNames: Array<string>;
    /** Technology Readiness Level: "1" to "9" (or "X1" to "X9" for obsolete/abandoned) */
    readinessLevel: string|null;
    isA: Array<ProcessReferenceData>;
    types: Array<ProcessReferenceData>;
    heroImage: ImageReferenceData|null;
    articleSections: Array<ArticleSection>;
    wikiquivalent: string|null;
}

/** A minimal subset of information, used when listing a bunch of Processes */
export type ProcessReferenceData = Pick<ProcessData, "uuid"|"shortId"|"name"|"description"|"readinessLevel">


export interface DesignData extends TechDbEntryData {
    altNames: Array<string>;
    wikiquivalent: string|null;
    isA: Array<TechConceptReferenceData>,
    versions: Array<DesignReferenceData>,
    variants: Array<DesignReferenceData>,
    antecedents: Array<DesignReferenceData>,
    derivedDesigns: Array<DesignReferenceData>,
    usedIn: Array<DesignReferenceData>,
    hasParts: Array<TechDbEntryReferenceData>,
    heroImage: ImageReferenceData|null;
    articleSections: Array<ArticleSection>;
}

/** A minimal subset of information, used when listing a bunch of TechConcepts */
export type DesignReferenceData = Pick<DesignData, "uuid"|"shortId"|"name"|"description">
