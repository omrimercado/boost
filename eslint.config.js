const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.config.js', '**/babel.config.js'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',
    },
  }
);
