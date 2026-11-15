import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

const sourceFiles = ['**/*.{ts,tsx,vue}'];

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      '.output/**',
      '.nuxt/**',
      '.cache/**',
      '**/*.min.js',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  ...vueA11y.configs['flat/recommended'],
  sonarjs.configs.recommended,

  {
    files: sourceFiles,
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      'no-undef': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-param-reassign': 'error',
      'no-else-return': 'error',
      'no-useless-return': 'error',
      'no-await-in-loop': 'error',
      'default-param-last': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'object-shorthand': ['error', 'always'],
      'prefer-const': 'error',
      'prefer-template': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-exponentiation-operator': 'error',

      complexity: ['error', { max: 15 }],
      'max-depth': ['error', { max: 4 }],
      'max-params': ['error', { max: 4 }],
      'sonarjs/cognitive-complexity': ['error', 15],

      'sonarjs/reduce-initial-value': 'error',
      'sonarjs/prefer-regexp-exec': 'error',
      'sonarjs/no-empty-collection': 'error',

      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='Object'][property.name=/^(keys|values|entries|fromEntries)$/]",
          message:
            'Use keysOf, valuesOf, entriesOf or recordOf from src/lib/records.ts.',
        },
      ],
    },
  },

  {
    files: sourceFiles,
    plugins: { unicorn },
    rules: {
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-string-raw': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/no-await-expression-member': 'error',
      'unicorn/no-array-reduce': 'off',
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/first-attribute-linebreak': 'off',

      'vue/no-v-html': 'error',
      'vue/no-mutating-props': 'error',
      'vue/no-setup-props-reactivity-loss': 'error',
      'vue/no-template-target-blank': 'error',
      'vue/no-duplicate-attributes': 'error',
      'vue/no-unused-components': 'error',
      'vue/no-unused-vars': 'error',
      'vue/no-use-v-if-with-v-for': 'error',
      'vue/no-side-effects-in-computed-properties': 'error',
      'vue/require-explicit-emits': 'error',
      'vue/require-typed-ref': 'error',

      'vuejs-accessibility/aria-role': 'error',
      'vuejs-accessibility/label-has-for': [
        'error',
        {
          required: 'id',
        },
      ],
    },
  },

  {
    files: ['src/lib/records.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  prettier,
);
