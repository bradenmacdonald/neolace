module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        // Never use single quotes because double quotes have same functionality, are easier to interchange with JSON,
        // and aren't as easily confused with backticks. `Backticks` may still be used anywhere they are useful.
        "quotes": ["warn", "double", {"avoidEscape": false, "allowTemplateLiterals": true}],
        // Make it an error if we forget to 'await' a promise
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/explicit-function-return-type": ["warn", {
            "allowExpressions": true,
            //"allowTypedFunctionExpressions": true,
        }],
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "no-empty": "off",
    },
};
