import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'open-design/.tmp/**',
      'vjr-estate-backend/dist/**',
      'vjr-estate-backend/types/generated/**',
      'functions/lib/**',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // The codebase legitimately uses `any` for untyped third-party APIs
      // (Google Maps, AI providers, Supabase row shapes). Treat it as a
      // warning rather than a hard error so lint stays green.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
