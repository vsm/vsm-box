module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recess-order'
  ],
  rules: {
    'no-empty-source': null,  // Required for '.vue' files.
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
  }
}