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
import { FormattedMessage, FormattedNumber } from "react-intl";

interface Props {
    sizeInBytes: number;
}

const KiB = 1024;
const MiB = 1024 * 1024;
const GiB = 1024 * 1024 * 1024;
const PiB = 1024 * 1024 * 1024 * 1024;

/**
 * Render a file size
 */
export const FormattedFileSize: React.FunctionComponent<Props> = (props) => {
    let size;
    let suffixElement;
    if (props.sizeInBytes < KiB) {
        size = props.sizeInBytes;
        suffixElement = <FormattedMessage defaultMessage="B" id="hIsHef" />;
    } else if (props.sizeInBytes < MiB) {
        size = props.sizeInBytes / KiB;
        suffixElement = <FormattedMessage defaultMessage="KiB" id="UBDW1H" />;
    } else if (props.sizeInBytes < GiB) {
        size = props.sizeInBytes / MiB;
        suffixElement = <FormattedMessage defaultMessage="MiB" id="5JEbBO" />;
    } else if (props.sizeInBytes < PiB) {
        size = props.sizeInBytes / GiB;
        suffixElement = <FormattedMessage defaultMessage="GiB" id="Co6oxr" />;
    } else {
        size = props.sizeInBytes / PiB;
        suffixElement = <FormattedMessage defaultMessage="PiB" id="9vOqpC" />;
    }
    return (
        <>
            <FormattedNumber value={size} maximumFractionDigits={1} /> {suffixElement}
        </>
    );
};
