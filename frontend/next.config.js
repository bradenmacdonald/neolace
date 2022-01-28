const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')
const path = require("path");

module.exports = (phase, { defaultConfig }) => {

    // When Neolace is accessed via this hostname, it shows the "admin site" for the Neolace domain
    const adminSiteHost = process.env.NEOLACE_ADMIN_SITE_HOST ?? "local.neolace.net";

    const baseConfig = {
        ...defaultConfig,
        reactStrictMode: true,
        images: {
            // Cut down on the number of different images sizes we have to deal with:
            deviceSizes: [640, 1080, 1920, 3840],
            domains: ["s3.us-west-000.backblazeb2.com"],
        },
        env: {
            // Should match images.deviceSizes:
            imageSizesAttr: "640px, 1080px, 1920px, 3840px",
        },
        i18n: {
            locales: ["en", "fr"],
            defaultLocale: "en",
        },
        // deno-lint-ignore require-await
        rewrites: async () => {
            // In order to support multitenancy with Next.js, we use a "rewrite" to include the host in the path
            return {
                afterFiles: [
                    {
                        //source: '/:path*', <-- not working (won't match '/') due to https://github.com/vercel/next.js/issues/14930
                        source: '/:path*{/}?',
                        has: [
                            {
                                type: 'host',
                                value: adminSiteHost,
                            },
                        ],
                        destination: '/admin-site/:path*',
                    },
                    {
                        source: '/:path*{/}?',
                        has: [
                            {
                                type: 'host',
                                value: '(?<siteHost>.*)',
                            },
                        ],
                        destination: '/site/:siteHost/:path*',
                    },
                ],
                fallback: [
                    {
                        source: '/:path*{/}?',
                        has: [
                            {
                                type: 'host',
                                value: '(?<siteHost>.*)',
                            },
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
            return config;
        },
    };

    if (phase === PHASE_DEVELOPMENT_SERVER) {
        return {
            /* development only config options here */
            ...baseConfig,
            images: {
                ...baseConfig.images,
                // Allow images from these domains to be used with the Next.js image component:
                domains: ["localhost", "127.0.0.1", "local.neolace.net"],
            },
        }
    }

    return {
        ...baseConfig,
    }
}
