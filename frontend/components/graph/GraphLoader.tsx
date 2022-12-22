import dynamic from "next/dynamic";

import type { GraphProps } from "./Graph"; // For some reason, we get a type error without this line.
import { Spinner } from "../widgets/Spinner";

/**
 * Our Graph code uses G6 which is HUGE (almost 0.5 MB compressed), so we need to use "Dynamic Import"
 * (https://nextjs.org/docs/advanced-features/dynamic-import) to load it dynamically only when needed.
 */
export const LookupGraph = dynamic<GraphProps>(
    () => import("./Graph").then((mod) => mod.LookupGraph),
    {
        // Display a spinner while the graph is loading:
        loading: () => <Spinner />,
        // If we wanted to skip generating the graph HTML on the server, we could use this:
        // ssr: false,
        // As of Next.js 13, we're getting a Suspense/hydration error unless we use this:
        ssr: false,
    },
);
