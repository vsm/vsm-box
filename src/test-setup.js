// This code is included before the tests that are run via 'npm run test'.


// Add JSDOM: a browser environment for Node, so that vue-test-utils can run.
require('jsdom-global')();

// Temporary workaround for: https://github.com/vuejs/vue-test-utils/issues/936 .
window.Date = Date;


// Prevent Vue warning, and make `Vue` globally available.
const Vue = require('vue');
Vue.config.productionTip = false;
global.Vue = Vue;


// Make `should` and `expect` globally available.
const chai = require('chai');
chai.should();
global.expect = chai.expect;

// Make `sinon` globally available.
global.sinon = require('sinon');


// Make `mount` and `shallowMount` (from 'vue-test-util') globally available.
const testUtils = require('@vue/test-utils');
global.mount        = testUtils.mount;
global.shallowMount = testUtils.shallowMount;


/**
 * Shorthand for `console.log()`.
 */
global.L = (...args) => console.log(...args);


/**
 * Easy log-function to inspect Objects.
 */
global.D = (obj, depth = 4) => console.dir(obj, {depth});


/**
 * Easy log-function to inspect Objects that have getter/setter-properties.
 */
global.J = obj => console.dir(JSON.parse(JSON.stringify(obj)));


/**
 * Log-function for showing more readable long HTML strings, while writing and
 * debugging tests.
 * The argument can be a String, or a 'vue-test-utils'-wrapped component,
 * in which case the HTML content of that component is shown.
 */
global.H = x =>
  console.log('- ' + (typeof x == 'string' ? x : x.html()) // (String vs. Comp).
    .replace(/(> *)</g, '$1\n  <'));
