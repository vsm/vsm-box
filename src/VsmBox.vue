<template>
  <div
    :style="{ width: width + 'px' }"
    class="vsm-box"
  >
    <the-conns
      :orig-conns="conns"
      :width="width"
      :sizes="sizesFull"
    />
    <the-terms
      ref="theTerms"
      :vsm-dictionary="vsmDictionary"
      :autofocus="autofocus"
      :placeholder="placeholder"
      :max-string-lengths="maxStringLengths"
      :item-literal-content="itemLiteralContent"
      :advanced-search="advancedSearch"
      :allow-class-null="allowClassNull"
      :orig-terms="terms"
      :sizes="sizesFull"
      @width="onTermsWidth"
      @change="onTermsChange"
    />
  </div>
</template>


<script>
import TheConns from './subcomponents/TheConns.vue';
import TheTerms from './subcomponents/TheTerms.vue';


// Defaults, used if the `sizes`-prop is not given, or omits certain properties.
// See 'README.md' for their descriptions.
const DefaultSizes = {
  minWidth: 200,

  minEndTermWidth: 40,
  minEndTermWideWidth: 100,

  defaultEditWidth: 80,
  defaultMaxWidth: 200,

  widthScale: 1,

  theConnsMarginBottom: 2,

  termDragThreshold: 3
};


export default {
  name: 'VsmBox',

  components: {
    'the-conns': TheConns,
    'the-terms': TheTerms
  },

  props: {
    vsmDictionary: {
      type: Object,
      required: true
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: [String, Boolean],
      default: false
    },
    maxStringLengths: {  // See `vsm-autocomplete`.
      type: Object,
      default: () => ({ str: 40, strAndDescr: 70 })
    },
    itemLiteralContent: {  // See `vsm-autocomplete`.
      type: [Function, Boolean],
      default: false
    },
    advancedSearch: {
      type: [Function, Boolean],
      default: false
    },
    allowClassNull: {
      type: Boolean,
      default: true
    },
    initialValue: {
      type: [Object, Boolean],
      default: () => ({ terms: [], conns: [] })
    },
    sizes: {
      type: Object,
      default: () => ({})
    }
  },

  data: function() { return {
    terms: this.initialValue.terms,
    conns: this.initialValue.conns,
    width: 0  // Will be calculated by and received from TheTerms.
  }; },


  computed: {
    // A copy of prop `sizes`, complemented with default values where needed.
    sizesFull() {
      return Object.assign({}, DefaultSizes, this.sizes);
    }
  },


  watch: {
    initialValue: {
      immediate: true,
      handler(val, oldVal) {
        if (val != oldVal) {  // Necessary at least for 'vue-test-utils'.
          this.preloadFixedTerms();
          this.preloadDictInfos();
        }
      }
    }
  },


  created: function() {
    this.width =  this.sizesFull.minWidth;
  },


  methods: {

    /**
     * For all fixedTerms found in `initialValue.terms[*].queryOptions', calls
     * `loadFixedTerms()` for them, grouped by their `queryOptions.z`-filter.
     */
    preloadFixedTerms() {
      var idtsByZ = {};  // FixedTerms, grouped by zObj, repres by JSON-str-key.
      this.initialValue.terms.forEach(term => {
        if (term.queryOptions) {
          var z = JSON.stringify(term.queryOptions.z || true);
          idtsByZ[z] = (idtsByZ[z] || []) .concat(term.queryOptions.idts || []);
        }
      });
      Object.keys(idtsByZ).forEach(z => {
        this.vsmDictionary.loadFixedTerms(idtsByZ[z], { z: JSON.parse(z) });
      });
    },


    /**
     * If `vsmDictionary` is wrapped in a VsmDictionaryCacher, preloads
     * dictInfos data for all dictIDs encounterd in `terms[*].queryOptions.**`.
     */
    preloadDictInfos() {
      if (this.vsmDictionary.cacheDI) {  // Detect 'vsm-dictionary-cacher'.
        var dictIDs = [];
        this.initialValue.terms.forEach(term => {
          if (term.queryOptions && term.str === undefined) { // Only Edit-Terms.
            dictIDs = dictIDs
              .concat((term.queryOptions.filter || {}).dictID || [])
              .concat((term.queryOptions.sort   || {}).dictID || []);
          }});
        this.vsmDictionary.getDictInfos({ filter: { id: dictIDs } }, () => {});
      }
    },


    onTermsWidth(width) {
      this.width = width;
    },


    onTermsChange(newTerms) {
      ///J(newTerms);
      this.$emit('change', newTerms);
    }
  }
};


///function J(obj) { console.dir(JSON.parse(JSON.stringify(obj))) }  0&&J;

</script>


<style scoped>
  *,
  *::before,
  *::after {
    line-height: 0;
  }
  .vsm-box {
    box-sizing: content-box;
    background-color: #fff;
    border: 1px solid #d3d9e5;
  }
  .vsm-box,
  .vsm-box >>> input {  /* '>>>' overrides scoped child CSS */
    /* This sets both vsm-autocomplete and plain <input>'s style */
    font-family: tahoma, verdana, arial, sans-serif;
    font-size: 11px;
    color: #000;
  }
  .terms,
  .conns {
    margin: 0;
  }
</style>
