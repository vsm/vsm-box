<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -->
  <!-- eslint-disable vue/singleline-html-element-content-newline -->
  <div
    :style="{
      top: px(term.y + term.height),
      left: px(term.x)
    }"
    class="popup"
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
  >
    <div
      :style="{
        top: px(-term.height),
        left: px(-termMargin.left),
        width: px(termMargin.left),
        height: px(term.height),
      }"
      class="hover-extend ext1"
    />
    <div
      :style="{
        top: px(-term.height),
        left: px(term.width),
        width: px(termMargin.right),
        height: px(term.height),
      }"
      class="hover-extend ext2"
    />
    <div class="hover-extend ext3" />
    <div class="arrow" />
    <div
      :class="['arrow-inner', {
        'no-info-panel': !hasInfo
      }]"
    />
    <div class="content">
      <div
        v-if="hasInfo"
        class="info"
      >
        <div
          v-if="isTypeRIC"
          class="info-term"
        >
          <div
            class="str"
            v-html="strs.str"
          />
          <div
            class="descr"
            v-html="strs.descr"
          />
          <div
            class="grey dict"
            v-html="strs.dict"
          />
          <div
            class="grey ids comma-sep"
          >
            <span
              v-if="isTypeRIC"
              class="class-id"
              v-html="strs.classID"
            /><span
              v-if="term.type == 'R'"
              class="parent-id"
              v-html="strs.parentID"
            /><span
              v-if="isTypeRI"
              class="inst-id"
              v-html="strs.instID"
            />
          </div>
        </div>
        <div
          v-if="strs.infoExtra1"
          class="grey info-extra1"
          v-html="strs.infoExtra1"
        />
        <div
          v-if="hasSettings"
          class="info-settings"
        >
          <div
            v-if="strs.queryFilter.length"
            class="query-filter list"
          >
            <div
              v-for="s in strs.queryFilter"
              :key="s"
              v-html="s"
            />
          </div>
          <div
            v-if="strs.querySort.length"
            class="query-sort list"
          >
            <div
              v-for="s in strs.querySort"
              :key="s"
              v-html="s"
            />
          </div>
          <div
            v-if="strs.queryFixedTerms.length"
            class="query-fixedterms list"
          >
            <div
              v-for="s in strs.queryFixedTerms"
              :key="s"
              v-html="s"
            />
          </div>
          <div
            v-if="strs.queryZ"
            class="query-z"
            v-html="strs.queryZ"
          />
          <div
            v-if="hasWidths"
            class="widths comma-sep"
          >
            <span
              v-if="strs.minWidth"
              class="min-width"
              v-html="strs.minWidth"
            />
            <span
              v-if="strs.maxWidth"
              class="max-width"
              v-html="strs.maxWidth"
            />
            <span
              v-if="strs.editWidth"
              class="edit-width"
              v-html="strs.editWidth"
            />
            <span
              v-if="strs.widthScale"
              class="width-scale"
              v-html="strs.widthScale"
            />
          </div>
        </div>
        <div
          v-if="strs.infoExtra2"
          class="grey info-extra2"
          v-html="strs.infoExtra2"
        />
      </div>
      <div class="menu">
        <div
          v-if="strs.menuExtra1"
          class="menu-block"
        >
          <div
            class="menu-extra1"
            v-html="strs.menuExtra1"
          />
        </div>
        <div class="menu-block">
          <div
            v-if="!isTermEditable"
            class="item edit"
            @click="onMenuEdit"
          >Edit<span class="hotkey">Doubleclick</span></div>
          <div
            v-if="isTermEditable && term.backup"
            class="item undo-edit"
            @click="onMenuUndoEdit"
          >Undo edit<span class="hotkey">Esc</span></div>
          <div
            v-if="!isTermEditable"
            :class="['item', 'copy', { 'inactive': !isCopyActive }]"
            @click="onMenuCopy"
          >Copy</div>
          <div
            v-if="!isTermEditable"
            :class="['item', 'copy-ref', { 'inactive': !isCopyRefActive }]"
            @click="onMenuCopyRef"
          >Copy reference</div>
          <div
            v-if="isTermEditable"
            :class="['item', 'paste', { 'inactive': !isPasteActive }]"
            @click="onMenuPaste"
          >Paste</div>
        </div>
        <div class="menu-block">
          <div class="item types">
            Type:
            <span
              :class="['type', 'ref', { 'selected': isTypeLike('R') }]"
              title="Referring instance"
              @click="() => onMenuSetType('R')"
            >Ref.</span><span
              :class="['type', 'inst', {
                'selected': isTypeLike('I'),
                'inactive': !canBecomeTypeIorC
              }]"
              title="Instance"
              @click="() => onMenuSetType('I')"
            >Inst.</span><span
              :class="['type', 'class', {
                'selected': isTypeLike('C'),
                'inactive': !canBecomeTypeIorC
              }]"
              @click="() => onMenuSetType('C')"
            >Class</span><span
              :class="['type', 'lit', { 'selected': isTypeLike('L') }]"
              title="Literal data"
              @click="() => onMenuSetType('L')"
            >Lit.</span>
            <span class="hotkey">Ctrl+click</span>
          </div>
          <div
            v-if="isTermEditable && term.type != 'EI'"
            class="item reset"
            @click="() => onMenuSetType('I')"
          >
            Reset type
            <span
              v-if="term.isEndTerm"
              class="hotkey"
            >Ctrl+Del</span>
          </div>
          <div
            v-if="!term.isEndTerm"
            class="item focal"
            @click="onMenuFocal"
          >
            {{ term.isFocal ? 'Unset as' : 'Make' }} focal
            <span class="hotkey">Alt+click</span>
          </div>
        </div>
        <div class="menu-block">
          <div
            class="item insert"
            @click="onMenuInsert"
          >
            Insert term
            <help v-if="term.isEndTerm" />
          </div>
          <div
            v-if="!term.isEndTerm"
            class="item remove"
            @click="onMenuRemove"
          >
            Remove
            <help />
          </div>
        </div>
        <div
          v-if="strs.menuExtra2"
          class="menu-block"
        >
          <div
            class="menu-extra2"
            v-html="strs.menuExtra2"
          />
        </div>
      </div>
    </div>
  </div>
  <!-- eslint-enable -->
</template>


<script>
import Help from './Help.vue';
import sanitizeHtml from './sanitizeHtml.js';
import stringStyleHtml from 'string-style-html';

var key = 0;


export default {
  name: 'ThePopup',

  components: {
    'help': Help,
  },

  props: {
    index: {
      type: Number,
      required: true
    },
    term: {
      type: Object,
      required: true
    },
    vsmDictionary: {
      type: Object,
      default: () => ({})
    },
    sizes: {
      type: Object,
      default: () => ({})
    },
    allowClassNull: {
      type: Boolean,
      default: true
    },
    termMargin: {
      type: Object,
      default: () => ({ left: 0, right: 0 })
    },
    customPopup: {
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
    descr: '',      // Given, or queried `term.descr`.
    dictID: '',     // (Similar).
    filterIDs: [],  // Shortcut to `term.queryOptions.filter.dictID`, if exists.
    sortIDs:   [],  // (Similar).
    idts:      [],  // (Similar).
    zFilter: true,  // (Similar).
    contentKey: 0,  // Prevents using stale results when a query responds late.
    zObj: {},       // Contains term's filtered z-obj if needed,queried&received.
    dictInfos: {}   // Maps `dictID`s to queried&received `dictInfo`-objects.
  }; },


  computed: {
    isTypeRIC() {
      return ['R', 'I', 'C'].includes(this.term.type);
    },

    isTypeRI() {
      return ['R', 'I'].includes(this.term.type);
    },

    hasSettings() {
      var o = this.strs;
      return o.queryFilter.length || o.querySort.length ||
        o.queryFixedTerms.length || o.queryZ || this.hasWidths;
    },

    hasInfo() {
      return this.isTypeRIC || this.hasSettings;
    },

    hasWidths() {
      return this.strs.minWidth || this.strs.maxWidth || this.strs.editWidth ||
        !!(this.sizes.widthScale - 1);
    },

    strs() {
      return this.calcStrs();
    },

    isTermEditable() {
      return this.term.type[0] == 'E';
    },

    isCopyActive() {
      return this.termCopy && !this.isTermEditable;
    },

    isCopyRefActive() {
      return this.isCopyActive && this.isTypeRI && this.term.instID;
    },

    isPasteActive() {
      return this.termPaste && this.isTermEditable;
    },

    canBecomeTypeIorC() {
      return this.isTermEditable || this.allowClassNull || this.term.classID;
    }
  },


  watch: {
    term: {
      immediate: true,
      handler() { this.initForNewTerm() }
    }

    // Note: it does not need to respond to changes in other props than `term`,
    // because ThePopup will only be shown after user-interaction, i.e. long
    // after creation. (This is also true for the standalone version of vsm-box,
    // for which props can only be updated to non-defaults, after creation).
  },


  methods: {

    initForNewTerm() {
      var empty = this.term.classID === null ? '-' : '';
      this.descr  = this.term.descr  || empty;  // Show '' before querying, or..
      this.dictID = this.term.dictID || empty;  // ..'-' if no (or after) query.

      var q  = this.term.queryOptions || {};
      this.filterIDs = (q.filter || {}) .dictID || [];
      this.sortIDs   = (q.sort   || {}) .dictID || [];
      this.idts      = q.idts || [];
      this.zFilter   = q.z || true;  // Queries: true=all, [..]=some, []=none.

      this.contentKey = key++;  // New `term` => mark that there is new content.
      this.zObj      = {};
      this.dictInfos = {};  // No cache-keeping here. Reset @switch to new Term.

      this.loadNewData();
    },


    /**
     * Start the asynchronous loading of any extra needed data.
     * 1. If needed, first query extra data for the term (='dictionary-entry').
     *    Else, or after that, get all necessary dictionary-info objects.
     * 2. Query the `str` for fixedTerms that were defined via an `id` only, and
     *    query the possible `style` for all fixedTerms.
     */
    loadNewData() {
      if (this.isTypeRIC && this.term.classID && (
        !this.dictID || !this.descr ||
        (this.customPopup && this.zFilter.length != 0)  // (0: only for `[]`).
      ))  this.loadTermData();
      else  this.loadDictInfos();

      this.loadFixedTermData();
    },


    loadTermData() {
      var contentKey = this.contentKey;

      this.vsmDictionary.getEntries(
        {
          filter: {
            id: [this.term.classID],                     // Query this one ID.
            ...this.dictID && { dictID: [this.dictID] }, // Add dictID if known.
          },
          z: this.customPopup ? this.zFilter : []
        },
        (err, res) => {
          if (contentKey != this.contentKey)  return;  // Discard stale result.
          if (!err && res.items.length) {
            var item = res.items[0];
            // Note below: `||''` is required for 'vue-test-utils@1.0.0-beta.26'.
            this.dictID = item.dictID || this.dictID || '';
            this.descr  = item.descr  || this.descr  || '';
            (item.terms || []).forEach(t => {  // Use a poss. overriding descr.
              if (this.term.str == t.str  &&  t.descr)  this.descr = t.descr;
            });
            this.zObj = item.z || {};
          }
          this.dictID = this.dictID || '-'; // '-' means: 'dictID unavailable'.
          this.descr  = this.descr  || '-';

          this.loadDictInfos();
        });
    },


    loadFixedTermData() {
      if (this.idts.length) {
        var contentKey = this.contentKey;

        this.vsmDictionary.getEntries(
          { filter: { id: this.idts.map(o => o.id), z: [] } },
          (err, res) => {
            if (contentKey == this.contentKey  && !err) {
              this.idts = this.idts.map(o => {  // Update each fixedTerm's data.
                o = Object.assign({}, o);
                res.items.forEach(item => {  // Find the item with fT.'s `id`.
                  if (o.id == item.id) {
                    // Update fT. with the matching term's `style`,
                    // or if no str-match: the first term's `style` and `str`.
                    var t = item.terms.find(t => o.str == t.str) || item.terms[0];
                    o.str   = t.str || '';
                    o.style = t.style;
                  }
                });
                return o;
              });
            }
          }
        );
      }
    },


    /**
     * Queries dictInfo-objects for the term's `dictID`, and for all `dictID`s
     * that appear it its `queryOptions.filter/sort`.
     * Note: VsmBox already preloaded dictInfos, if a cacher was detected.
     */
    loadDictInfos() {
      var dictIDs = [...new Set(                               // (Unduplicate).
        (!this.dictID || this.dictID == '-' ? [] : [this.dictID])
          .concat(this.filterIDs)
          .concat(this.sortIDs)
      )];

      if (dictIDs.length) {
        var contentKey = this.contentKey;
        this.vsmDictionary.getDictInfos({ filter: { id: dictIDs } },
          (err, res) => {
            if (contentKey == this.contentKey && !err)  res.items.forEach(item =>
              this.$set(this.dictInfos, item.id, item)
            );
          });
      }
    },


    calcStrs() {
      var term = this.term;
      var f = x => x === undefined ? '' : '' + x;  // Num->Str, undefined->''.

      // Ensure: for R-Terms, if any of parent/classID ==null, show both as null.
      // (Internally one may be not-null, for term-type change or ref-connecting
      // backup reasons, but towards the outside world, both are then null).
      var nullPC = term.type == 'R'  &&  (!term.parentID || !term.classID) ?
        null : 1;

      var strs = {
        str: stringStyleHtml(term.str || '', term.style),
        descr: this.descr,
        dict:  this.dictString(this.dictID),

        classID:  this.idCalc(nullPC && term.classID),  // (nullPC==1 => classID).
        instID:   this.idCalc(term.instID),
        parentID: this.idCalc(nullPC && term.parentID),

        queryFilter: this.filterIDs.map(id  => this.dictString(id)), // }Arrays..
        querySort:   this.sortIDs  .map(id  => this.dictString(id)), // }..of..
        queryFixedTerms:                                             // }..Strs.
                     this.idts    .map(obj => this.idtsString(obj)),
        queryZ:      this.zString(),

        minWidth:   f(term.minWidth),
        maxWidth:   f(term.maxWidth),
        editWidth:  f(term.editWidth),
        widthScale: this.sizes.widthScale == 1 ? '' :
          f(~~(this.sizes.widthScale *100 +.5) /100), // Round to max 2 decimals.

        infoExtra1: '',
        infoExtra2: '',
        menuExtra1: '',
        menuExtra2: ''
      };

      if (this.customPopup)  strs = this.customPopup(
        { strs,  term: term,  type: term.type,
          dictInfo: this.dictInfos[this.dictID] || {},
          z: this.zObj,  vsmDictionary: this.vsmDictionary,  sizes: this.sizes }
      );

      Object.keys(strs).forEach(k =>
        strs[k] = Array.isArray(strs[k]) ?
          strs[k].map(s => sanitizeHtml(s)) : sanitizeHtml(strs[k])
      );
      return strs;
    },


    idCalc(id) {
      return id === undefined ?  '' :  this.uriTail(id) || '&hellip;';
    },


    uriTail(s) {  // E.g. 'http://x.org/sub/DICT1' -> 'DICT1'.
      return (s || '').replace(/^.*\/([^/]*)$/,'$1');
    },


    dictString(dictID) {
      if (dictID == '-' || !dictID)  return dictID;

      var di = this.dictInfos[dictID] || { id: dictID };
      return [
        di.name ? di.name : 0,
        di.abbrev ? '(' + di.abbrev + ')' : '[' + this.uriTail(di.id) + ']'
      ] .filter(x => x) .join(' ');
    },


    idtsString(o) {
      return (o.str ? (stringStyleHtml(o.str, o.style) + ' ') : '') +
        '[' + this.uriTail(o.id) + ']';
    },


    zString() {
      return this.zFilter === true ? '' :
        !this.zFilter.length ? '(none)' : this.zFilter.join(', ');
    },


    px(s) {
      return s + 'px';
    },


    onMouseenter()   { this.$emit('mouseenter') },
    onMouseleave()   { this.$emit('mouseleave') },


    // Emits an event, with `index` inserted as 1st arg. before any other ones.
    emit2(eventStr, ...args)  { this.$emit(eventStr, this.index, ...args) },

    onMenuEdit()      { this.emit2('edit'     ) },
    onMenuUndoEdit()  { this.emit2('undo-edit') },

    onMenuCopy()     { if (this.isCopyActive   )  this.emit2('copy'    ); },
    onMenuCopyRef()  { if (this.isCopyRefActive)  this.emit2('copy-ref'); },
    onMenuPaste()    { if (this.isPasteActive  )  this.emit2('paste'   ); },

    /**
     * Tells if this.term is of base-type `t` (one of R/I/C/L).
     * E.g. if this.term is an ER- or R-type term, then isTypeLike('R') is true.
     */
    isTypeLike(t)  { return [t, 'E' + t].includes(this.term.type) },

    /**
     * Emits 'set-type', only if Term does not have the target type already,
     * and if the Term is allowed to change to that type.
     */
    onMenuSetType(baseType)  {
      var setType = (this.isTermEditable ? 'E' : '') + baseType;
      if (setType != this.term.type  &&
        (this.canBecomeTypeIorC || !['I', 'C'].includes(setType))
      ) {
        this.emit2('set-type', setType);
      }
    },

    onMenuFocal()  { this.emit2('toggle-focal') },
    onMenuInsert()  { this.emit2('insert') },
    onMenuRemove()  { this.emit2('remove') }
  }
};
</script>


<style scoped>
  .popup,
  .arrow,
  .arrow-inner,
  .hover-extend {
    position: absolute;
    display: block;
    line-height: normal;
    cursor: default;
  }

  .popup {
    z-index: 4;  /* This places it above any Term's TheList and TheSpinner */
    width: 240px;
    margin-top: 8px;
    border: 1px solid #c4c4c4;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }

  .hover-extend {
    /* Put all `.ext*` elem.s' coo.-origin back at Term's bottom-left corner: */
    margin-top: -9px;   /* Equals `.arrow-inner`'s `top` */
    margin-left: -1px;  /* Equals `.popup`'s `border-left-width` */
    background-color: transparent;
  }

  .ext3 {  /* => No 'mouseleave' from the visual gap between popup & Terms */
    width: 100%;              /* Fallback */
    width: calc(100% + 2px);  /* Adds `.popup`'s left&right border */
    height: 9px;  /* Equals: minus `.arrow`'s `top` */

    /* Note: `.ext1/2` => Same for gap between Term's left/right neighbor */
  }

  .arrow,
  .arrow-inner {
    top: -9px;
    left: 1px;
    width: 0;
    height: 0;
    border-right: 9px solid transparent;
    border-bottom: 9px solid #c4c4c4;  /* Equals `.popup`'s `border-color` */
    border-left: 9px solid transparent;
  }

  .arrow-inner {
    top: -7.5px;  /* A bit below `.arrow` => only `.arrow`'s top-borders show */
    left: 2.5px;
    border-width: 0 7.5px 7.5px 7.5px;  /* Make it not overlap `.content` */
    border-bottom-color: #fff;  /* Equals `.content`'s `background-color` */
  }

  .arrow-inner.no-info-panel {
    border-bottom-color: #f6f6f6;  /* Equals `.menu`'s `background-color` */
  }

  .content {  /* Covers (vertically-down-shifted) `.arrow-inner`'s bottom part */
    z-index: 500;  /* Equals `.popup`'s `z-index` + 1 : to cover `arrow-inner` */
    width: 100%;
    color: #000;
    background-color: #fff;
  }

  .popup,
  .content {
    border-radius: 1.5px;
  }

  .info {
    max-height: 111px;
    padding: 8px 0 0 0;
    overflow: auto;
    border-bottom: 1px solid #c4c4c4;
  }

  .info::after {  /* Instead of padding-bottom. Circumvents bug in Firefox 64 */
    display: block;
    height: 8px;
    line-height: 0;
    content: " ";
  }

  .info > div {
    padding: 0 8px 0 9px;
  }

  .info > div:not(:first-child)::before,
  .menu > div:not(:first-child)::before {
    display: block;
    height: 0;
    margin: 7px -2px 5px -2px;
    line-height: 0;
    content: " ";
    border-top: 1px dotted #e0e0e0;
  }

  .menu > div:not(:first-child)::before {
    margin: 2px 0 2px 0;
    border-top: 1px solid #d7d7d7;  /* Color: equals `.menu-sep`'s bkgr-color */
  }

  .str {
    font-size: 12px;
    font-weight: bold;
  }

  .descr {
    min-height: 14px;
    padding: 6px 0 0 1px;
  }

  .dict {
    padding: 6px 0 0 0;
  }

  .grey {
    color: #888;
  }

  .info-settings {
    font-size: 10px;
    color: #aaa;
  }

  .info-settings > div {
    padding-top: 2px;
  }

  .info-settings > div > div:first-child {
    padding-top: 1px;
  }

  .dict::before {
    content: "Dict: ";
  }

  .comma-sep > span:not(:last-child)::after {
    content: ", ";
  }

  .class-id::before {
    content: "Class: ";
  }

  .parent-id::before {
    content: "\a0Parent: ";  /* '\a0' = '&nbsp;' */
  }

  .inst-id::before {
    content: "\a0Inst: ";
  }

  .info-settings .list > div::before {
    padding-left: 6px;
    content: "- ";
  }

  .query-filter::before {
    content: "Autocomplete limits to: ";
  }

  .query-sort::before {
    content: "Autocomplete prioritizes: ";
  }

  .query-fixedterms::before {
    content: "Autocomplete's fixedTerms: ";
  }

  .query-z::before {
    content: "Customizers get only extra: ";
  }

  .widths::before {
    content: "Widths: ";
  }

  .min-width::before {
    content: "min:";
  }

  .max-width::before {
    content: "max:";
  }

  .edit-width::before {
    content: "edit:";
  }

  .width-scale::before {
    content: "scale:";
  }

  .menu {
    padding: 2px 0 2px 0;
    background-color: #f6f6f6;
  }

  .item,
  .menu-extra1,
  .menu-extra2 {
    padding: 3px 16px 2px 22px;
  }

  .item {
    border: 1px solid #f6f6f6;  /* Same as `.content/.menu`'s bkgr-color */
    border-width: 1px 0;
  }

  .item .hotkey {
    position: relative;
    float: right;
    color: #c1c1c1;
  }

  .item:hover {
    background-color: #d1e2f2;
    border-color: #81b4e7;
  }

  .item.inactive,
  .types .type.inactive,
  .hotkey.help {
    color: #9d9d9d;
  }

  .item.inactive:hover {
    background-color: #e1e1e1;
    border-color: #b4b4b4;
  }

  .types .type {
    padding: 3px 4px 2px 4px;
  }

  .types:not(:hover) .type.selected {
    padding-top: 2px;
    border: 1px solid #d1d1d1;
  }

  .types:hover .type.selected {
    background-color: #add2f8;
    border: 1px solid #add2f8;
    border-width: 0 1px;
  }

  .types:hover .type:not(.selected):not(.inactive):hover {
    background-color: #8ebef3;
  }

  .hotkey.help {
    padding: 0 0 1px 8px;
    border: 0 solid #c1c1c1;
    border-left-width: 1px;
  }

  .hotkey.help:hover {
    color: #6d7dbd;
    border-color: #7c8dcd;
  }
</style>
