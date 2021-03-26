import React from 'react';

import classes from './MetadataTable.module.scss';

interface Props {
}

export const MetadataTable: React.FunctionComponent<Props> = (props) => {

    return <div className="row">
        <div className="col col-12">
            <table className={classes.table}>
                <tbody>
                    {props.children}
                </tbody>
            </table>
        </div>
  </div>
};

interface EntryProps {
    // Label: says what this metadata value is ("Also Known As", "Examples", etc.)
    label: string;
}

/** An entry (basically a key-value pair) in a metadata table */
export const MetadataEntry: React.FunctionComponent<EntryProps> = (props) => {

    return <tr>
        <th>{props.label}</th>
        <td>{props.children}</td>
    </tr>
};
