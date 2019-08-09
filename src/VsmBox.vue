<template>
  <div
    :style="{ width: width + 'px' }"
    class="vsm-box"
  >
    <the-conns
      :orig-conns="origConns"
      :width="width"
      :sizes="sizesFull"
      :terms-change-nr="termsChangeNr"
      :enabled="isTheConnsEnabled"
      @change="onConnsChange"
      @change-init="onConnsChangeInit"
      @click-above-end-term="onClickAboveEndTerm"
    />
    <the-terms
      ref="theTerms"
      :vsm-dictionary="vsmDictionary"
      :query-options="queryOptions"
      :autofocus="autofocus"
      :placeholder="placeholder"
      :max-string-lengths="maxStringLengths"
      :fresh-list-delay="freshListDelay"
      :advanced-search="advancedSearch"
      :allow-class-null="allowClassNull"
      :orig-terms="origTerms"
      :sizes="sizesFull"
      :custom-item="customItem"
      :custom-item-literal="customItemLiteral"
      :custom-term="customTerm"
      :custom-popup="customPopup"
      :term-copy="termCopy"
      :term-paste="termPaste"
      @width="onTermsWidth"
      @change.native.stop="x => x"
      @change.exact="onTermsChange"
      @change-init="onTermsChangeInit"
      @drag-start="onDragStart"
      @drag-stop="onDragStop"
    />
  </div>
</template>


<script>
/**!
 * vsm-box
 * (c) 2012-2019 Steven Vercruysse
 */

import TheConns from './subcomponents/TheConns.vue';
import TheTerms from './subcomponents/TheTerms.vue';

const clone = obj => JSON.parse(JSON.stringify(obj));


// Defaults, used if the `sizes`-prop is not given, or omits certain properties.
// See 'README.md' for their descriptions.
const DefaultSizes = {
  minWidth: 200,

  minEndTermWidth: 40,
  minEndTermWideWidth: 100,

  defaultEditWidth: 80,
  defaultMaxWidth: 200,

  widthScale: false,

  termDragThreshold: 3,

  delayPopupShow:   650,  // Delay to show ThePopup.
  delayPopupSwitch: 300,  // Delay to switch a visible ThePopup to a new Term.
  delayPopupHide:   200,  // Delay to hide ThePopup.

  theConnsMarginBottom: 2,  // Faked, drawable-upon 'margin' above TheTerms.
  theConnsSpaceBelow: 3,    // Space between fake margin and lowest Conn-level.
  theConnsMinLevels: 3,     // How many 'levels' are shown initially.
  theConnsLevelHeight: 19,  // How heigh each 'level' in TheConns is.
  theConnsResortDelay: 300, // How long to wait after adding/removing a Conn, ..
  // ..before resorting. This delay allows users to first see the simple result..
  // ..of their action, before connectors may be reorganised by resorting.

  connLineWidth: 1,  // Could also be 2, or 1.2, or 0.8, etc.

  connBackDepth: 6,  // A Conn's back is this much below the top of its level.
  connFootDepth: 17, // (Same for its feet).

  connBackColor: '#7a7a7a',
  connLegColor:  '#7a7a7a',
  connFootColor: '#b6b6b6',
  connFootIndent: 1, // How many pixels to not cover, left&right above its Term.
  connFootVisible: true,

  connTridRelW: 3.9, // Trident-connector Relation-leg pointer *half*-width.
  connTridRelH: 6.9, // Trident-connector Relation-leg pointer *full*-height.
  connTridObjW: 3.5,
  connTridObjH: 4.72,
  connListBackSep: 1.79,
  connListRelW: 3.2,
  connListRelH: 5.8,
  connRefDashes: '2 1',  // The SVG 'stroke-dash-array' for Ref-connectors.
  connRefParW: 2.85,
  connRefParH: 4.5,

  connStubBackColor: '#c3c3c3',
  connStubLegColor:  '#c3c3c3',
  connStubFootColor: '#cbcbcb',

  connStubSubBackW:  9,  // Bident stub-subject's extended-backbone width.
  connStubObjBackW: 10,

  connStubSubLegH: 3.5,  // Less high, as it has no triangle/arrow pointer.
  connStubRelLegH: 4.5,  // Height of this stub leg, between backbone and foot.
  connStubObjLegH: 4.5,

  connStubSubFootW: 2.7,
  connStubRelFootW: 2.8,
  connStubObjFootW: 2.8,

  connStubRelW: 1.7,
  connStubRelH: 3.55,
  connStubObjW: 1.8,
  connStubObjH: 3.7,

  connUCLegColor:  'rgba(46,72,255,0.56)',  // Under-construction color.
  connUCFootColor: '#e6e6e6',
  connUCLegShorter: 4,

  connHLColor:      '#e5e9fb',
  connHLColorLight: '#f0f4fb',
  connHLBackHeight: 10,  // Height of gapless rect., highlighting the backbone.
  connHLLegOutdent: 1,   // Extra pixel-col.s to cover, left&right above a Term.
  connHLBorderRadius: 2.6,

  connRIW: 11,         // Width and height of a connector's Remove Icon.
  connRIPadding: 2.5,  // Padding of " .
  connRILineWidth: 2,  // Linewidth for the Remove Icon's cross.
  connRIFGColor: ['#aabcce',     '#fff',    '#fff'   ], // Foreground/backgr.-..
  connRIBGColor: ['transparent', '#7491ab', '#446d9c'] // ..color in 3 states.
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
      // VsmBox must be loadable without a 'vsm-dictionary' prop, in case the
      // prop is assigned after initial loading. So, declare a skeleton Object:
      default: () => ({
        loadFixedTerms: (a, o, c) => c(null),
        getExtraDictInfos: () => [],
        getDictInfos: (o, c) => c(null, { items: [] }),
        getEntries:   (o, c) => c(null, { items: [] }),
        getMatchesForString: (s, o, c) => c(null, { items: [] })
      })
    },
    queryOptions: {
      type: [Object, Boolean],
      default: false
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
      default: () => ({ str: 50, strAndDescr: 80 })
    },
    freshListDelay: {
      type: Number,
      default: 250
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
    },
    customTerm: {
      type: [Function, Boolean],
      default: false
    },
    customPopup: {
      type: [Function, Boolean],
      default: false
    },
    customItem: {
      type: [Function, Boolean],
      default: false
    },
    customItemLiteral: {  // See `vsm-autocomplete`.
      type: [Function, Boolean],
      default: false
    },
    termCopy: {
      type: [Function, Boolean],
      default: false
    },
    termPaste: {
      type: [Function, Boolean],
      default: false
    }
  },

  data: function() { return {
    origTerms: [],
    origConns: [],
    latestTerms: [],
    termsChangeNr: 1,
    width: 0,  // Will be calculated by and received from TheTerms.
    isTheConnsEnabled: true
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
        if (val == oldVal)  return;  // Necessary, at least for 'vue-test-utils'.
        this.origConns = false;

        // First preload more data, then let TheTerms process the new terms.
        var origTerms = val.terms || [];
        origTerms = this.mapFixedTerms(origTerms, true);
        this.preloadFixedTerms(origTerms);
        this.preloadDictInfos (origTerms);
        this.origTerms = origTerms;
      }
    },

    vsmDictionary: function(val, oldVal) {
      if (val == oldVal)  return;
      this.preloadFixedTerms(this.origTerms);
      this.preloadDictInfos (this.origTerms);
    }
  },


  created: function() {
    this.width =  this.sizesFull.minWidth || DefaultSizes.minWidth;
  },


  methods: {

    /**
     * For all fixedTerms found in `terms[*].queryOptions', this calls
     * `loadFixedTerms()` for them, grouped by their `queryOptions.z`-filter.
     */
    preloadFixedTerms(terms) {
      var ftByZ = {};  // FixedTerms grouped by zObj, representd by JSON-str-key.
      terms.forEach(term => {
        if (term.queryOptions) {
          var z = JSON.stringify(term.queryOptions.z || true);
          ftByZ[z] = (ftByZ[z] || []) .concat(term.queryOptions.idts || []);
        }
      });
      Object.keys(ftByZ).forEach(z => {
        this.vsmDictionary.loadFixedTerms(
          ftByZ[z], { z: JSON.parse(z) }, () => {} );
      });
    },


    /**
     * If `vsmDictionary` is wrapped in a VsmDictionaryCacher, this preloads
     * dictInfo-data for all dictIDs found in `terms[*].queryOptions`.
     */
    preloadDictInfos(terms) {
      if (this.vsmDictionary.cacheDI) {  // Detect 'vsm-dictionary-cacher'.
        var dictIDs = [];
        terms.forEach(term => {
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


    onTermsChangeInit(newTerms) {
      this.latestTerms = newTerms;
      this.origConns = this.initialValue.conns || [];
    },


    onConnsChangeInit(newConns) {
      this.emitValue(newConns, 'change-init');
    },


    onTermsChange(newTerms) {
      this.latestTerms = newTerms;
      this.termsChangeNr++;
    },


    onConnsChange(o) {
      if (!o.termsChangeNr  ||  o.termsChangeNr == this.termsChangeNr) {
        this.emitValue(o.conns);
      }
    },


    onClickAboveEndTerm() {
      this.$refs.theTerms.moveInputToEndTerm(true);
    },


    onDragStart() {
      this.isTheConnsEnabled = false;
    },


    onDragStop() {
      this.isTheConnsEnabled = true;
    },


    emitValue(newConns, eventStr = 'change') {
      var terms = clone(this.latestTerms);
      terms = this.mapFixedTerms(terms);
      this.$emit(eventStr, { terms, conns: newConns });
    },


    /**
     * Temporary hack that changes received Terms' `queryOptions.fixedTerms`
     * to `.idts`, and vice versa for emitted Terms.
     * This is done in anticipation of an update of the `vsm-dictionary-*`
     * modules, which will use the clearer property name `fixedTerms` too.
     */
    mapFixedTerms(terms, inp) {
      var a = inp ? 'fixedTerms' : 'idts';
      var b = inp ? 'idts' : 'fixedTerms';
      return terms.map(term => {
        if (term.queryOptions && term.queryOptions[a]) {
          term = clone(term);
          term.queryOptions[b] = term.queryOptions[a];
          delete term.queryOptions[a];
        }
        return term;
      });
    }
  }
};


///function J(obj) { console.dir(JSON.parse(JSON.stringify(obj))) }  J;

</script>


<style scoped>
  *,
  *::before,
  *::after {
    line-height: 0;
  }

  .vsm-box {
    box-sizing: content-box;
    text-align: left;
    background-color: #fff;
    border: 1px solid #d3d9e5;
  }

  .vsm-box,
  .vsm-box >>> input,  /* '>>>' overrides scoped child CSS */
  .vsm-box >>> .placehold {
    /* This sets both vsm-autocomplete and plain <input>'s style */
    font-family: tahoma, verdana, arial, sans-serif;

    /* 'font-size' should equal TheTerms's `defaultFontSize`. External CSS may
       may override this CSS-value; if so then `widthScale` will automatically
       update accordingly. */
    font-size: 11px;
  }

  .vsm-box,
  .vsm-box >>> input {
    color: #000;
  }

  .terms,
  .conns {
    margin: 0;
  }
</style>
