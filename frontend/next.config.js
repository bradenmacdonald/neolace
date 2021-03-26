const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {

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
        }
    };

    if (phase === PHASE_DEVELOPMENT_SERVER) {
        return {
            /* development only config options here */
            ...baseConfig,
            images: {
                ...baseConfig.images,
                // Allow images from these domains to be used with the Next.js image component:
                domains: ["localhost"],
            },
        }
    }

    return {
        ...baseConfig,
    }
}
