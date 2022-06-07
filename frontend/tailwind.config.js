/**
 * We want our CSS theme colors to be determined by the "site" (multi-tenant support with each "site" having a different
 * theme).
 * 
 * This is relatively simple to do using CSS variables that get injected into a <style> element in the <head>. However,
 * by default Tailwind won't correctly interpret a custom variable in the way that's necessary to convert it to
 * rgba() format so that it can combine with other tailwind directives like "text-opacity-50".
 * This function solves that problem, with the only catch being that the variable is just a tuple of R, G, B components
 * and not a full color spec.
 * 
 * See https://github.com/tailwindlabs/tailwindcss/issues/3003 for details.
 * This solution courtesy of https://github.com/adamwathan/tailwind-css-variable-text-opacity-demo/
 */
const themeColorFromRbgTupleVar = (runtimeCssVariableName) => ({ opacityVariable, opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${runtimeCssVariableName}), ${opacityValue})`
    }
    if (opacityVariable !== undefined) {
      return `rgba(var(${runtimeCssVariableName}), var(${opacityVariable}, 1))`
    }
    return `rgb(var(${runtimeCssVariableName}))`
}


module.exports = {
    // Tell Tailwind how to check which styles are used and which can be removed in production:
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './plugins/**/*.{js,ts,jsx,tsx}'],
    // Neolace theme:
    theme: {
        extend: {
            colors: {
                // primary: themeColorFromRbgTupleVar("--site-primary-color"),
                "theme-link-color": themeColorFromRbgTupleVar("--site-link-color"),
                "theme-heading-color": themeColorFromRbgTupleVar("--site-heading-color"),
                // The header at the top of the page:
                "header-color": "#343a40",
                "header-color-light": "#6c757d",
            },
            fontFamily: {
                sans: ['"Inter Var"', '"Noto Sans"', "Inter", "Roboto", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
                mono: ['"Roboto Mono"', "ui-monospace", "Menlo", "Monaco", "Consolas", "monospace", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
            },
        },
    },
    plugins: [],
}
