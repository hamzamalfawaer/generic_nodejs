import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    {
        rules: {
            '@typescript-eslint/no-dynamic-delete': 'off',
            '@typescript-eslint/no-explicit-any': "error",

            '@typescript-eslint/no-console': 'warn',
            '@typescript-eslint/no-return-assign': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/prefer-const': 'error',
            '@typescript-eslint/comma-dangle': 'off',
            '@typescript-eslint/indent': 'error',
            "@typescript-eslint/space-in-parens": ["error", "never"],
            "@typescript-eslint/no-process-env": "error",
            "@typescript-eslint/no-useless-constructor": "warn",

            "@typescript-eslint/no-empty-function": "off",
            // "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^(_$|__)",
                    "varsIgnorePattern": "^(_$|__)",
                    "caughtErrorsIgnorePattern": "^(_$|__)"
                }
            ],
            "@typescript-eslint/no-async-promise-executor": "error"
        }
    },
);
