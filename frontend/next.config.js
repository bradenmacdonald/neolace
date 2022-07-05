const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const path = require("path");

module.exports = (phase, { defaultConfig }) => {
    
    /** @type {import("next").NextConfig} */
    let baseConfig = {
        //...defaultConfig,
        reactStrictMode: true,
        images: {
            // Cut down on the number of different images sizes we have to deal with.
            // One size (2000px) should be exactly double the width of "hero images" on entry pages.
            imageSizes: [256],
            deviceSizes: [640, 1000, 2000, 4000],
            domains: ["s3.us-west-000.backblazeb2.com"],
        },
        env: {
            // Should match images.deviceSizes:
            imageSizesAttr: "640px, 1000px, 2000px, 4000px",
        },
        i18n: {
            locales: ["en", "fr", "ru"],
            defaultLocale: "en",
        },
        experimental: {
            // Don't transform ES6 to ES5 for older browsers:
            browsersListForSwc: true,
            legacyBrowsers: false,
            // Don't require <a> inside <Link>
            newNextLinkBehavior: true,
        },
        rewrites: async () => {
            // In order to support multitenancy with Next.js, we use a "rewrite" to include the host in the path
            return {
                afterFiles: [
                    {
                        //source: '/:path*', <-- not working (won't match '/') due to https://github.com/vercel/next.js/issues/14930
                        source: '/:path*{/}?',
                        has: [
                            {type: 'host', value: '(?<siteHost>.*)'},
                        ],
                        destination: '/site/:siteHost/:path*',
                    },
                ],
                fallback: [
                    {
                        source: '/:path*{/}?',
                        has: [
                            {type: 'host', value: '(?<siteHost>.*)'},
                        ],
                        destination: '/site/:siteHost/fallback/:path*',
                    },
                ],
            };
        },
        webpack: (config, options) => {
            // Tell webpack to prepare to dynamically load our configured plugins
            // See https://www.grouparoo.com/blog/nextjs-plugins#hacking-the-nextjs-webpack-configuration
            // config.module.rules.push({
            //     test: /plugins\/.*\.tsx?/,
            //     use: [options.defaultLoaders.babel],
            // });
            // we want to ensure that the server project's version of react is used in all cases
            config.resolve.alias["react"] = path.join(__dirname, "node_modules", "react");
            config.resolve.alias["react-dom"] = path.resolve(__dirname, "node_modules", "react-dom");
            config.resolve.alias["scheduler"] = path.resolve(__dirname, "node_modules", "scheduler");
            return config;
        },
    };

    if (phase === PHASE_DEVELOPMENT_SERVER) {
        baseConfig = {
            /* development only config options here */
            ...baseConfig,
            images: {
                ...baseConfig.images,
                // Allow images from these domains to be used with the Next.js image component:
                domains: ["localhost", "127.0.0.1", "local.neolace.net"],
            },
        }
    }

    if (process.env.ANALYZE === 'true') {
        const withBundleAnalyzer = require('@next/bundle-analyzer')({
            enabled: true,
        });
        baseConfig = withBundleAnalyzer(baseConfig);
    }

    return baseConfig;
}
