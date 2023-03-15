/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { useDropzone } from "react-dropzone";
import { FormattedMessage } from "react-intl";
import { Icon } from "./Icon";

interface Props {
    onDrop: (acceptedFiles: File[]) => void;
    children?: never;
}

export const FileDropzone: React.FunctionComponent<Props> = ({onDrop}: Props) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className={`
            block w-full rounded border-2 border-dashed border-slate-300 bg-white text-slate-700 cursor-pointer
            text-lg text-center
            px-3 py-16
            ${isDragActive ? "border-theme-link-color" : "border-slate-300"}
        `}>
            <input {...getInputProps()} />
            <Icon icon="plus-lg" />{" "}<FormattedMessage defaultMessage="Click here to add a file or drag and drop files here." id="qsrP3h" />
        </div>
    );
};
