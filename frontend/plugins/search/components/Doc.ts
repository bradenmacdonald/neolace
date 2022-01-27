import { VNID } from 'neolace-api/types.ts';


export interface Doc {
    id: VNID;
    name: string;
    type: string;
    description: string;
    articleText: string;
}
