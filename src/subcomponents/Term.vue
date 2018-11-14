<template>
  <div
    :style="{
      width: term.width + 'px',
      height: term.height + 'px',
      top: ( term.drag ? term.drag.y : term.y) + 'px',
      left: (term.drag ? term.drag.x : term.x) + 'px',
      margin: 0
    }"
    :class="['term', {
      'edit': term.type && term.type[0] == 'E',
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
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
    @mousedown.left.exact.self.prevent.stop="onMousedown_div"
    @mousedown.left.exact.stop="onMousedown"
    @mousedown.left.ctrl.exact="onCtrlMousedown"
    @mousedown.left.ctrl.shift.exact.prevent="onCtrlShiftMousedown"
    @mousedown.left.alt.exact="onAltMousedown"
    @click.left.exact="onClick"
    @dblclick.left.exact="onDblclick"
  ><input
    v-if="showPlain"
    ref="input_plain"
    :value="term.str"
    :autofocus="autofocus"
    :placeholder="!hasFocus && placeholder"
    class="input"
    spellcheck="false"
    @input="event => onInputChange(event.target.value)"
    @focus="onFocus"
    @blur="onBlur"
    @keydown.esc.exact.prevent="onKeyEsc"
    @keydown.8.exact="onKeyBksp_plain"
    @keydown.enter.exact="onKeyEnter_plain"
    @keydown.enter.ctrl.exact="onKeyCtrlEnter"
    @keydown.enter.shift.exact="onKeyShiftEnter"
    @keydown.tab.exact.prevent="() => onKeyTab('')"
    @keydown.tab.shift.exact.prevent="() => onKeyTab('shift')"
  ><vsm-autocomplete
    v-else-if="showAutocomplete"
    :vsm-dictionary="vsmDictionary"
    :autofocus="autofocus"
    :placeholder="placeholder"
    :max-string-lengths="maxStringLengths"
    :item-literal-content="itemLiteralContent"
    :query-options="term.queryOptions"
    :initial-value="term.str"
    v-on="hasItemLiteral ? { 'item-literal-select': onItemLiteralSelect } : {}"
    @input-change="onInputChange"
    @focus="onFocus"
    @blur="onBlur"
    @key-esc="onKeyEsc"
    @key-bksp="onKeyBksp"
    @key-ctrl-enter="onKeyCtrlEnter"
    @key-shift-enter="onKeyShiftEnter"
    @key-tab="onKeyTab"
    @item-select="onItemSelect"
    @list-open="onListOpen"
  /><span
    v-else
    v-html="label"
  /></div>
</template>


<script>
/**
 * `Term` is responsible for presenting a VSM-term, and for notifying listeners
 * of any events that happen on it.
 * It does not change any data in TheTerms' `terms`.
 */

// Currently `vsm-autocomplete` pkg is uncompiled Vue code, so include it like..
import VsmAutocomplete from '../../node_modules/vsm-autocomplete'; // ..<- this.
/// import VsmAutocomplete from 'vsm-autocomplete';
import stringStyleHtml from 'string-style-html';


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
    autofocus: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: [String, Boolean],
      default: false
    },
    maxStringLengths: {
      type: Object,
      required: true
    },
    itemLiteralContent: {
      type: [Function, Boolean],
      default: false
    },
    hasItemLiteral: {
      type: Boolean,
      default: true
    }
  },


  data: function() { return {
    hasFocus: false,
    noFade: false
  }; },


  computed: {
    showPlain() {
      return this.hasInput && (this.term.type == 'EL' || this.term.type == 'ER');
    },
    showAutocomplete() {
      return this.hasInput && !this.showPlain;
    },
    label() {
      return stringStyleHtml(this.term.str, this.term.style);
    }
  },


  watch: {
    showPlain: {
      immediate: true,
      handler(val) { if (val)  this.emitInputChange(this.term.str); }
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


    onKeyBksp_plain() {  // Backspace on plain <input>-element. Not on autocompl.
      // If only whitespace and cursor at start, empty first. Then, if empty,
      // call the real `onKeyBksp()`. (This mimics VsmAutocomplete's behavior).
      var el = this.$refs.input_plain;
      if (el.value && !el.value.trim() && !el.selectionStart) {
        this.emitInputChange(el.value = '');
      }
      if (!el.value)  this.onKeyBksp();
    },

    onKeyEsc()        { this.emit2('key-esc') },
    onKeyBksp()       { this.emit2('key-bksp') },
    onKeyCtrlEnter()  { this.emit2('key-ctrl-enter') },
    onKeyTab(str)     { this.emit2('key-tab', str) },
    onKeyAltUp()      { this.emit2('key-alt-up') },
    onKeyAltDown()    { this.emit2('key-alt-down') },
    onKeyCtrlDelete() { this.emit2('key-ctrl-delete') },
    onKeyShiftEnter() { this.emit2('key-shift-enter') },

    // Note: mouseleave; not mouseout which bubbles up from each sub-elem.
    onMouseleave()   { this.emit2('mouseleave') },
    onMouseenter()   { this.emit2('mouseenter') },

    emitInputChange(str) { this.emit2('input-change', str) },
    onInputChange  (str) { this.emitInputChange(str) },

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
      if (this.showPlain || this.showAutocomplete) { // Both types use same CSS-..
        this.$el.querySelector('.input').focus();    // ..class on their <input>.
      }
    },

    // `onMousedown()` detects `mousedown` on entire Term, incl. possible input.
    onMousedown(event) { this.emit2('mousedown', event) },

    onCtrlShiftMousedown(event) { this.emit2('ctrl-shift-mousedown', event) },
    onCtrlMousedown()  { this.emit2('ctrl-mousedown') },
    onAltMousedown()   { this.emit2('alt-mousedown') },
    onClick()          { this.emit2('click') },
    onDblclick()       { this.emit2('dblclick') }
  }
};
</script>


<style scoped>
</style>
