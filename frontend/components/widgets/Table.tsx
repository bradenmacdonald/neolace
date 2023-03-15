/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { displayText, TranslatableString, TranslatableText } from "components/utils/i18n";
import React from "react";

interface Props {
    headings: {
        heading: TranslatableText;
        right?: boolean;
    }[];
    children: React.ReactNode;
}

/**
 * A table
 */
export const Table: React.FunctionComponent<Props> = (props: Props) => {
    return (
        <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full max-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    {props.headings.map((h, idx) =>
                                        <th key={idx} scope="col" className={`
                                            py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900sm:pl-6
                                            ${idx === 0 ? "sm:pl-6" : ""}
                                            ${idx === props.headings.length -1 ? "sm:pr-6" : ""}
                                            ${h.right ? "text-right" : ""}
                                        `}>
                                            {displayText(h.heading)}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {props.children}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TableRowProps {
    children: React.ReactNode;
}

export const TableRow: React.FunctionComponent<TableRowProps> = (props: TableRowProps) => {
    return (
        // first 
        // last sm:pr-6
        <tr className="[&>td]:relative [&>td]:py-4 [&>td]:pl-3 [&>td]:pr-4 [&>td]:text-sm [&>td]:font-medium [&>td:first-child]:sm:pl-6 [&>td:last-child]:sm:pr-6">
            {props.children}
        </tr>
    );
};
