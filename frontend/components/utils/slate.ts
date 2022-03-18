import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
//import { HistoryEditor } from 'slate-history'

export type NeolaceSlateEditor = BaseEditor & ReactEditor; // & HistoryEditor

export type ParagraphElement = {
    type: "paragraph";
    children: NeolaceSlateText[];
};

export type HeadingElement = {
    type: "heading";
    level: number;
    children: NeolaceSlateText[];
};

export type NeolaceSlateElement = ParagraphElement | HeadingElement;

export type PlainText = { text: string };

export type NeolaceSlateText = PlainText;

declare module "slate" {
    interface CustomTypes {
        Editor: NeolaceSlateEditor;
        Element: NeolaceSlateElement;
        Text: NeolaceSlateText;
    }
}
