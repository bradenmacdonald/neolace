import React from "react";

import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { LookupEvaluatorWithPagination } from "components/widgets/LookupEvaluator";
import { MDTContext } from "components/markdown-mdt/mdt";

const expr = `
    allEntries().filter(entryType=entryType("early-paper")).withDetail(prop=prop("date-published")).sort(by=(e -> e.detail), reverse=true)
`;

const PostersPresentations: React.FunctionComponent<PluginPageProps> = function (props) {

    const mdtContext = React.useMemo(() => new MDTContext({}), []);

    return (
        <SitePage title="Early Papers">
            <h1 className="text-3xl font-semibold">Early Papers</h1>
            <LookupEvaluatorWithPagination expr={expr} mdtContext={mdtContext} pageSize={50} />
        </SitePage>
    );
};

export default PostersPresentations;
