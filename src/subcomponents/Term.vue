<template>
  <!-- eslint-disable vue/multiline-html-element-content-newline -->
  <!-- eslint-disable vue/html-indent -->
  <!-- eslint-disable vue/html-closing-bracket-newline -->
  <div
    :style="{
      width: term.width + 'px',
      height: term.height + 'px',
      top: ( term.drag ? term.drag.y : term.y) + 'px',
      left: (term.drag ? term.drag.x : term.x) + 'px',
      margin: 0
    }"
    :class="['term', {
      'edit': isEditType,
      'lit': term.type == 'L' || term.type == 'EL',
      'class': term.type == 'C' || term.type == 'EC',
      'inst': term.type == 'I' || term.type == 'R',
      'ref': term.type == 'R' || term.type == 'ER',
      'focal': term.isFocal,
      'end': term.isEndTerm,
      'drag': term.drag,
      'inp': hasInput || showAutocomplete,
      'focus': hasFocus && hasInput,
      'nofade': noFade
    }]"
    @keydown.up.alt.exact="onKeyAltUp"
    @keydown.down.alt.exact="onKeyAltDown"
    @keydown.46.ctrl.exact="onKeyCtrlDelete"
    @keydown.8.ctrl.exact="onKeyCtrlBksp"
    @keydown.tab.exact="onKeyTab"
    @keydown.tab.shift.exact="onKeyShiftTab"
    @mouseover="onMouseenter"
    @mouseleave="onMouseleave"
    @mousedown.left.exact.self.prevent.stop="onMousedown_div"
    @mousedown.left.exact.stop="onMousedown"
    @mousedown.left.ctrl.exact="onCtrlMousedown"
    @mousedown.left.ctrl.shift.exact.prevent="onCtrlShiftMousedown"
    @mousedown.left.alt.exact="onAltMousedown"
    @click.left.exact.self.prevent.stop="onClick_div"
    @click.left.exact.stop="onClick"
    @dblclick.left.exact="onDblclick"
  ><div
    v-if="showPlain"
    class="input-wrap plain"
    ><input
      ref="input_plain"
      :value="term.str"
      :autofocus="autofocus"
      class="input plain"
      spellcheck="false"
      @input="event => onInput(event.target.value)"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.esc.exact.prevent="onKeyEsc"
      @keydown.8.exact="onKeyBksp_plain"
      @keydown.8.ctrl.exact.stop="onKeyCtrlBksp"
      @keydown.enter.exact="onKeyEnter_plain"
      @keydown.enter.ctrl.exact="onKeyCtrlEnter"
      @keydown.enter.shift.exact="onKeyShiftEnter"
    ><span
      v-if="finalPlaceholder"
      :class="['placehold plain', {
        'focus': hasFocus,
        'hidden': !showPlainPlaceholder
      }]"
      v-text="finalPlaceholder"
    /></div
  ><vsm-autocomplete
    v-else-if="showAutocomplete"
    ref="vsmac"
    :vsm-dictionary="vsmDictionary"
    :autofocus="autofocus"
    :placeholder="finalPlaceholder"
    :query-options="finalQueryOptions"
    :max-string-lengths="maxStringLengths"
    :fresh-list-delay="freshListDelay"
    :initial-value="term.str"
    :custom-item="customItem"
    :custom-item-literal="customItemLiteral"
    v-on="hasItemLiteral ? { 'item-literal-select': onItemLiteralSelect } : {}"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
    @key-esc="onKeyEsc"
    @key-bksp="onKeyBksp"
    @key-ctrl-enter="onKeyCtrlEnter"
    @key-shift-enter="onKeyShiftEnter"
    @item-select="onItemSelect"
    @list-open="onListOpen"
    @mouseover.native.stop="x => x"
    @mouseover-input="onMouseenter"
  /><span
    v-else
    :class="['label', {
      'label-placehold': !term.label && finalPlaceholder
    }]"
    v-html="term.label || finalPlaceholder"
  /></div>
  <!-- eslint-enable -->
</template>


<script>
/**
 * `Term` is responsible for presenting a VSM-term, and for notifying listeners
 * of any events that happen on it.
 * It does not change any data in TheTerms' `terms`.
 */

// `vsm-autocomplete` pkg is (for now) uncompiled Vue code, so include it like..
import VsmAutocomplete from '../../node_modules/vsm-autocomplete'; // ..<-this.
import to from './termOperations.js';


export default {
  name: 'Term',

  components: {
    'vsm-autocomplete': VsmAutocomplete
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
    hasInput: {
      type: Boolean,
      default: false
    },
    vsmDictionary: {
      type: Object,
      required: true
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
    tabListenMode: {  // One of : 0,1,2,3.
      type: Number,
      default: 3
    },
    maxStringLengths: {
      type: Object,
      required: true
    },
    freshListDelay: {
      type: Number,
      default: 0
    },
    hasItemLiteral: {
      type: Boolean,
      default: true
    },
    customItem: {
      type: [Function, Boolean],
      default: false
    },
    customItemLiteral: {
      type: [Function, Boolean],
      default: false
    }
  },


  data: function() { return {
    hasFocus: false,
    noFade: false
  }; },


  computed: {
    isEditType() {
      return this.term.type && this.term.type[0] == 'E';
    },

    showPlain() {
      return this.hasInput && (this.term.type == 'EL' || this.term.type == 'ER');
    },

    showAutocomplete() {
      return this.hasInput && !this.showPlain;
    },

    finalQueryOptions() {
      return to.clone(
        Object.assign({}, this.queryOptions, this.term.queryOptions) );
    },

    finalPlaceholder() {
      return this.isEditType ?
        (this.term.placeholder || this.placeholder || '') : '';
    },

    showPlainPlaceholder() {
      return this.showPlain && this.finalPlaceholder && !this.term.str;
    }
  },


  watch: {
    showPlain: {
      immediate: true,
      handler(val) { if (val)  this.emitInput(this.term.str); }
    },

    // After TheTerm's code changes anything in `term` (or at creation time),
    // prevent the border to fade/transition: add temp. transition-blocking CSS.
    term: {
      deep: true,
      immediate: true,
      handler() {
        this.noFade = true;
        setTimeout(() => this.noFade = false, 2);
      }
    }
  },


  methods: {

    // Emits an event, with `index` inserted as 1st arg. before any other ones.
    emit2(eventStr, ...args) {
      this.$emit(eventStr, this.index, ...args);
    },


    inputElement() {
      return this.$el.querySelector('input');
    },


    onKeyBksp_plain(ev) {
      /* Called for Backspace on plain <input>-element; not on autocomplete.
         If only whitespace and cursor at start, empty first. Then, if empty,
         call the real `onKeyBksp()`. (Mimics VsmAutocomplete's behavior). */
      var el = this.$refs.input_plain;
      if (el.value && !el.value.trim() && !el.selectionStart) {
        this.emitInput(el.value = '');
      }
      if (!el.value) {
        this.onKeyBksp();
        ev.preventDefault();
      }
    },

    onKeyCtrlBksp() {
      /* If empty/whitespace, emit 'key-ctrl-bksp'.
         If not empty: if cursor at start, make input get emptied;
         else, let browser handle Ctrl+Bksp. */
      if (!this.term.str.trim())  this.emit2('key-ctrl-bksp');
      else {
        var el = this.inputElement();
        if (el && !el.selectionStart)  this.emitInput(el.value = '');
      }
    },

    onKeyTab(ev) {  // If `tabListenMode` is 1 or 3, respond to a pure Tab.
      this.tabHandler(ev, '',      this.tabListenMode & 1);
    },

    onKeyShiftTab(ev) {  // If `tabListenMode` is 2 or 3, respond to Shift+Tab.
      this.tabHandler(ev, 'shift', this.tabListenMode & 2);
    },

    tabHandler(ev, str, consume) {
      // If we respond to (Shift+/)Tab, then make the browser not respond.
      if (consume)  ev.preventDefault();
      this.emit2('key-tab', consume ? str : 'ignore');
    },

    onKeyEsc()        { this.emit2('key-esc') },
    onKeyBksp()       { this.emit2('key-bksp') },
    onKeyCtrlEnter()  { this.emit2('key-ctrl-enter') },
    onKeyAltUp()      { this.emit2('key-alt-up') },
    onKeyAltDown()    { this.emit2('key-alt-down') },
    onKeyCtrlDelete() { this.emit2('key-ctrl-delete') },
    onKeyShiftEnter() { this.emit2('key-shift-enter') },

    // Note: `mouseleave`; not `mouseout` which bubbles up from each sub-elem.
    onMouseleave()   { this.emit2('mouseleave') },
    onMouseenter()   { this.emit2('mouseenter') },

    emitInput(str)   { this.emit2('input', str) },
    onInput  (str)   { this.emitInput(str) },

    onFocus()        { this.hasFocus = true;  this.emit2('focus') },
    onBlur()         { this.hasFocus = false; this.emit2('blur')  },
    onListOpen()     { this.emit2('list-open') },
    onItemSelect(match)   { this.emit2('item-select', match) },
    onItemLiteralSelect() { this.emit2('item-literal-select') },
    onKeyEnter_plain()    { this.emit2('plain-enter') },


    /**
     * `onMousedown_div()` detects `mousedown`, on Term padding or border only.
     * (Which is achieved via a `.self.prevent` (in that order!) attribute-tail
     * in HTML).
     * + Doesn't respond to mousedown on the possibly contained <input> (plain
     *   or autocomplete), because it calls focus() on the input. And that would
     *   block users from using mousedown to start selecting text in that input.
     * + Does not `$emit()`, as `onMousedown()` will do that.
     */
    onMousedown_div() {
      if (this.showPlain || this.showAutocomplete)  this.inputElement().focus();
    },

    // `onMousedown()` detects `mousedown` on entire Term, incl. possible input.
    onMousedown(event) { this.emit2('mousedown', event) },

    onCtrlShiftMousedown(event) { this.emit2('ctrl-shift-mousedown', event) },
    onCtrlMousedown()  { this.emit2('ctrl-mousedown') },
    onAltMousedown()   { this.emit2('alt-mousedown') },
    onClick()          { this.emit2('click') },

    /**
     * Makes a Click that happened on the border/padding of a Term with
     * autocomplete (but not on match-list item; hence again `.self.prevent`),
     * have the same effect as a Click on vsm-autocomplete <input>, so that
     * it also may open its matches-list.
     */
    onClick_div()      { this.sendToAC('click') },

    /**
     * - Reports a Dblclick to the parent component.
     * - Also, with a plain <input>: unselects any text. This makes a Dblclick
     *   there have the same effect as on a VsmAutocomplete input.
     * - Also, with a <vsm-autocomplete>: in case the DblClick happened on the
     *   border/padding of the Term, makes it have the same effect as a Dblclick
     *   on the VsmAutocomplete: which makes it close any open matches-list.
     */
    onDblclick() {
      var el = this.$refs.input_plain;
      if (el) el.selectionStart = el.selectionEnd = this.term.str.length;
      this.sendToAC('dblclick');
      this.emit2('dblclick');
    },

    /**
     * Triggers 'eventStr' as a non-bubbling mouse event
     * on VsmAutocomplete's <input>, if VsmAutocomplete is mounted.
     */
    sendToAC(eventStr) {
      var el = this.$refs.vsmac;
      if (el)  el = this.inputElement();
      if (el)  el.dispatchEvent(new MouseEvent(eventStr, { bubbles: false }));
    }
  }
};
</script>


<style scoped>
</style>
