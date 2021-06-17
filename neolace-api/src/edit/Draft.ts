import { VNID } from "../types";
import { EditChangeType } from "./Edit";

export enum DraftStatus {
    Open = 0,
    Accepted = 1,
    Cancelled = 2,
}

export interface DraftEditData {
    id: VNID;
    code: string;
    changeType: EditChangeType;
    data: any;
    timestamp: Date;
}

export interface DraftData {
    id: VNID;
    author: {
        username: string;
        fullName: string|null;
    },
    title: string;
    description: string|null;
    status: DraftStatus;
    created: Date;

    edits?: DraftEditData[];
}
