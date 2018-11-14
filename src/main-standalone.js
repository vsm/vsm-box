// This code is the main entrypoint for 'npm run build:standalone'.


// This makes webpack bundle our Vue-component as a self-contained web-element.
// Then users (=other developers) can choose to not deal with Vue:
// they only have to include the {package}.js script-tag, and they can
// insert the custom HTML-tag `<{tag-name} ...>` anywhere in their HTML.


// Use polyfill for support for custom HTML-elements.
import 'document-register-element/build/document-register-element';

// Import the Vue framework. This also makes it bundled into the output JS.
import Vue from 'vue';

// Import the `vue-custom-element` plugin.
import vueCustomElement from 'vue-custom-element';
Vue.use(vueCustomElement);

// Register our Vue-component as a custom element. This makes it a web-component.
import VsmBox from './VsmBox.vue';
Vue.customElement('vsm-box', VsmBox);


/*/
// NOTE: using '@vue/web-component-wrapper' instead of the above,
//       doesn't seem to work (yet).
//
// Wrap our Vue-component into a 'web-component'.
// + This still needs two lines like this in the HTML-page:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.1.0/webcomponents-sd-ce.js"></script>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/vue/2.5.13/vue.runtime.min.js"></script>
//   + Vue (line 2) could also have been included in the built bundle, instead.
import VsmBox from './VsmBox.vue';
import wrap from '@vue/web-component-wrapper';
////import
////'../node_modules/@vue/web-component-wrapper/dist/vue-wc-wrapper.global.js';
window.customElements.define('vsm-box', wrap(Vue, VsmBox));
//*/
