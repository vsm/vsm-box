module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    mocha: true  // => no 'no-undef' error for `describe`/`it` in mocha tests.
  },
  globals: {  // Prevent 'no-undef' errors for globally available functions.
    Vue: true,
    expect: true,  // Chai's `expect`.
    sinon: true,
    mount: true,         // } From 'vue-test-utils'.
    shallowMount: true,  // }
    L: true,  // } Some easy data-inspection functions.
    D: true,  // }
    J: true,  // }
    H: true   // }
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/recommended'
  ],
  parserOptions: { sourceType: 'module' },
  plugins: ['vue'],
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always', { 'omitLastInOneLineBlock': true }],
    'arrow-parens': ['error', 'as-needed'],
    'no-console': 'off',
    'keyword-spacing': 'error',
    'max-len': ['error', {
      code: 80,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreComments: false,
      // Allow a trailing punctuation mark at pos. 81, and a '.' or ';' at 82.
      ignorePattern: '^.{0,80}[^a-zA-Z0-9][.;]?$'
    }],
    'vue/no-v-html': 'off'
  }
};
