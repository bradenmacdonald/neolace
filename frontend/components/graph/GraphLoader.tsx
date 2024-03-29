/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import dynamic from "next/dynamic";

import type { Props } from "./GraphDataStreamer"; // For some reason, we get a type error without this line.
import { Spinner } from "../widgets/Spinner";

/**
 * Our Graph code uses G6 which is HUGE (almost 0.5 MB compressed), so we need to use "Dynamic Import"
 * (https://nextjs.org/docs/advanced-features/dynamic-import) to load it dynamically only when needed.
 */
export const LookupGraph = dynamic<Props>(
    () => import("./GraphDataStreamer").then((mod) => mod.GraphDataStreamer),
    {
        // Display a spinner while the graph is loading:
        loading: () => <Spinner />,
        // If we wanted to skip generating the graph HTML on the server, we could use this:
        // ssr: false,
        // As of Next.js 13, we're getting a Suspense/hydration error unless we use this:
        ssr: false,
    },
);
