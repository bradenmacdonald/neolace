import { api } from "lib/api-client";
import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from 'slate-history'

export type NeolaceSlateEditor = BaseEditor & ReactEditor & HistoryEditor;

export type NeolaceSlateElement = api.MDT.Node;

export type PlainText = { text: string };

export type NeolaceSlateText = PlainText;

declare module "slate" {
    interface CustomTypes {
        Editor: NeolaceSlateEditor;
        Element: NeolaceSlateElement;
        Text: api.MDT.TextNode;
    }
}
