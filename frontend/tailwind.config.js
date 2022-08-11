/** @type {import('tailwindcss').Config} */
module.exports = {
    // Tell Tailwind how to check which styles are used and which can be removed in production:
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './plugins/**/*.{js,ts,jsx,tsx}'],
    // Neolace theme:
    theme: {
        extend: {
            colors: {
                // Theme colors, which get derived from CSS variables depending on the current site.
                // The <alpha-value> placeholder is necessary for Tailwind to be able to adjust these colors as needed
                // for things like "text-opacity-50"
                "theme-link-color": "rgb(var(--site-link-color) / <alpha-value>)",
                "theme-heading-color": "rgb(var(--site-heading-color) / <alpha-value>)",
                // The header at the top of the page:
                "header-color": "#343a40",
                "header-color-light": "#6c757d",
                // For coloring widgets related to an entry type. These colors can be overriden using the CSS variables.
                "entry-type-color-0": "var(--entry-type-color-0, #F1F5F9)",
                "entry-type-color-1": "var(--entry-type-color-1, #CBD5E1)",
                "entry-type-color-2": "var(--entry-type-color-2, #0F172A)",
            },
            fontFamily: {
                sans: ['"Inter Var"', '"Noto Sans"', "Inter", "Roboto", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
                mono: ['"Roboto Mono"', "ui-monospace", "Menlo", "Monaco", "Consolas", "monospace", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
            },
        },
    },
    plugins: [],
}
