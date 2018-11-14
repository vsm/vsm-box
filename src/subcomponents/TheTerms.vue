<template>
  <div
    :style="{
      width: width + 'px',
      height: height + 'px'
    }"
    class="terms"
    @mousedown.left.exact="onMousedown_div"
  >
    <span
      ref="ruler"
      class="ruler term"
    />
    <term
      v-for="(term, index) in terms"
      :key="term.key"
      :term="term"
      :index="index"
      :has-input="index == inputIndex"
      :vsm-dictionary="vsmDictionary"
      :autofocus="index == inputIndex && autofocus"
      :placeholder="terms.length == 1 && placeholder"
      :max-string-lengths="maxStringLengths"
      :item-literal-content="itemLiteralContent2"
      :has-item-literal="!!(allowClassNull || advancedSearch)"
      unselectable="on"
      @input-change="onInputChange"
      @key-esc="onKeyEsc"
      @key-bksp="onKeyBksp"
      @key-ctrl-enter="onKeyCtrlEnter"
      @key-tab="onKeyTab"
      @key-alt-up="onKeyAltUp"
      @key-alt-down="onKeyAltDown"
      @key-ctrl-delete="onKeyCtrlDelete"
      @key-shift-enter="onKeyShiftEnter"
      @mouseenter="onMouseenter"
      @mouseleave="onMouseleave"
      @focus="onFocus"
      @blur="onBlur"
      @list-open="onListOpen"
      @item-select="onItemSelect"
      @item-literal-select="onItemLiteralSelect"
      @plain-enter="onPlainEnter"
      @mousedown="onMousedown"
      @ctrl-mousedown="onCtrlMousedown"
      @ctrl-shift-mousedown="onCtrlShiftMousedown"
      @alt-mousedown="onAltMousedown"
      @click="onClick"
      @dblclick="onDblclick"
    />
    <div
      v-if="dragIndex >= 0"
      :style="{
        width: terms [dragIndex].width + 'px',
        height: terms[dragIndex].height + 'px',
        top: terms [dragIndex].y + 'px',
        left: terms[dragIndex].x + 'px',
      }"
      class="term drag-placeholder"
    />
    <the-popup
      v-if="popupLoc >= 0 && popupLoc < terms.length"
      :term="terms[popupLoc]"
      class="popup"
    />
  </div>
</template>


<script>
import Term from './Term.vue';
import ThePopup from './ThePopup.vue';


var lastKey = -1;

export default {
  name: 'TheTerms',

  components: {
    'term': Term,
    'the-popup': ThePopup
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
    maxStringLengths: {
      type: Object,
      required: true
    },
    itemLiteralContent: {
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
    origTerms: {
      type: Array,
      required: true
    },
    sizes: {
      type: Object,
      required: true
    }
  },

  data: function() { return {
    terms: [],  // Current state of Terms. Starts as augmented `origTerms`.
    padTop: 0,        // } These will be computed after 'mounted'.
    padRight: 0,      // } ". = Inner padding of TheTerms.
    padBottom: 0,     // } "
    padLeft: 0,       // } "
    bkgrColor: '',    // } ". = Background color of TheTerms. Used by TheConns.
    termPadBordLR: 0, // } ". = Sum of a Term's inner left+right padding+border.
    termMarginHor: 0, // } ". = Maximum of a Term's left and right margin.
    termHeight: 0,    // } ". Note: it's a value, while termWidth is a function.
    inputIndex: 0,   // Index of Term that now has the input or vsm-autocomplete.
    popupLoc: -1, // Index of Term that now has an associated PopupBox; -1=none.
    width: 0, // Width incl padding/border. Is updated by `setTermCoordinates()`.
    hasEndTermFocus: false,  // Tells if the endTerm currently has the focus.
    endSpaceX: 0,  // All clicks to the right of this will focus the endTerm.
    dragIndex: -1  // When >= 0, it is the index of a currently dragged Term.
  }; },


  computed: {
    height() {
      return this.termHeight + this.padTop + this.padBottom;
    },

    itemLiteralContent2() { // Makes a default function for it if none is given.
      return this.itemLiteralContent ||
        (arr => str => `<div title="${arr[0]}">${arr[1]} '${str}' ▸</div>`)(
          this.advancedSearch ?
            ['Advanced search', 'Search'] :
            ['Create new concept', 'Create'] );
    }
  },


  watch: {
    origTerms: function() {
      this.initForNewTerms();
    },

    hasEndTermFocus: function(val) { // Recalc. endTerm coo.s; may need to widen.
      if (val)  this.setTermCoordinates(this.terms.length - 1);
    }
  },


  mounted: function() {
    this.measureSizes();
    this.initForNewTerms();
  },


  methods: {


    //
    // --- DIMENSIONS, TERM-POSITIONING, and EXTRA TERM PROPS ------------------
    //

    /**
     * We make `measureSizes()` access the ruler-element in this separate func.,
     * only so that the tests can override it and insert extra functionality.
     */
    getRuler() {
      return this.$refs.ruler;
    },


    /**
     * This measures some sizes set by CSS, that will not change after creation.
     */
    measureSizes() {
      var style = getComputedStyle(this.$el);
      var num  = s    => +s.replace(/px$/, '');
      var calc = side => num( style['padding-' + side] );
      this.padTop    = calc('top');
      this.padRight  = calc('right');
      this.padBottom = calc('bottom');
      this.padLeft   = calc('left');

      this.bkgrColor = style['background-color'];

      var ruler = this.getRuler();
      style = getComputedStyle(ruler);
      calc = side =>
        num(style['padding-' + side]) +
        num(style['border-' + side + '-width']);
      this.termPadBordLR = calc('left') + calc('right');

      calc = side => num(style['margin-' + side]);
      this.termMarginHor = calc('left') + calc('right');

      ruler.innerHTML = 'W';  // Make it not empty, in order to measure height.
      this.termHeight = ruler.offsetHeight;
    },


    /**
     * Calculates (using the DOM) how wide a Term should be made (including
     * padding and borders), so that it can contain the given string `str`.
     * If needed, the string is hereby trimmed to be only `maxStrWidth` px wide
     * (this width excludes Term's padding and borders).
     * Notes:
     * + Trimming happens via CSS's `text-overflow:ellipsis`.
     * + Instead of using `offsetWidth` which is a rounded up/down integer,
     *   we get the full-precision width, and then always round it up.
     *   Like this, e.g. for a string (that does not need trimming and) that is
     *   70.23px wide, the Term's width will be set so that the contained string
     *   gets 71px space, and not 70px (which would 'text-overflow'-truncate it).
     * + If an `editStrWidth` is given, it overrides the given min/max-widths.
     * + Term-width = allocated string-width + Term's padding & borders.
     */
    termWidth(str, minStrWidth, maxStrWidth, editStrWidth = false) {
      var f = w => Math.ceil(w * this.sizes.widthScale) + this.termPadBordLR;
      var r = this.$refs.ruler;
      r.innerHTML = str;
      r.style =
        editStrWidth ?       `width:${f(editStrWidth)}px;` :
          (minStrWidth ? `min-width:${f( minStrWidth)}px;` : '') +
          (maxStrWidth ? `max-width:${f( maxStrWidth)}px;` : '');
      var w = Math.ceil(r.getBoundingClientRect().width);  // Not `offsetWidth`.
      r.style = '';
      return w;
    },


    initForNewTerms() {
      // Clone the given `terms`, and give them an extra `type` property.
      var terms = this.origTerms.map(term =>
        Object.assign({}, term, { type: this.termToType(term) })
      );

      // Add the EndTerm, an Edit-Instance-type Term.
      terms.push({ isEndTerm: true, type: 'EI' });

      // Determine which Editable Term (or the end-Term) gets VsmAutocomplete.
      this.inputIndex = terms.length;
      for (var i = 0; i < terms.length; i++) {
        if (this.isTermEditable(terms[i]))  { this.inputIndex = i;  break }
      }

      // Add a unique `:key` to each (required for `v-for`). (Note that a Term's
      // `index`(=position) can change, and `term.id+term.str` is not unique).
      terms.forEach(term => term.key = ++lastKey);

      this.setTermCoordinates(0, terms);

      // Assign all `terms` at once, only now. This makes all added sub-prop.s
      // Vue-reactive.  (Also do this only now, to not confuse vue-test-utils).
      this.terms = terms;
    },


    /**
     * Infers the type of a term given in VsmBox's `initialValue.terms`.
     */
    termToType(term) {                               /* eslint-disable indent */
      return term.str === undefined ?   // Editable; subtypes Class/Lit/Inst/Ref.
          (['EC', 'EL', 'ER'].includes(term.type) ? term.type : 'EI') :
        term.classID  === undefined ? 'L' :  // Literal, data term.
        term.instID   === undefined ? 'C' :  // Class, general Term.
        term.parentID === undefined ? 'I' :  // Instance, specific Term.
        'R';                                 // Referring (=further-spec.) term.
    },                                                /* eslint-enable indent */


    isTermEditable(term) {
      return term.type[0] == 'E';
    },


    /**
     * (Re-)Calculates coordinates & dimensions for Terms, and related data.
     * Can start recalculating from a given `startIndex`, for efficiency.
     */
    setTermCoordinates(startIndex = 0, terms) {
      terms = terms || this.terms;
      startIndex = 0;
      var i = startIndex - 1;
      var x = startIndex ? (terms[i].x + terms[i].width + this.termMarginHor) :
        this.padLeft;
      var t, editWidth;

      while ((t = terms[++i])) {  // == "As long as there are Terms, .."
        t.str = t.str || '';

        if (t.isEndTerm) {
          // Calc. X-coo. of "endTerm's space": starts at endTerm's left margin.
          this.endSpaceX = !i ?  0 :  x - this.termMarginHor;

          editWidth = Math.ceil(this.sizes.widthScale * (this.hasEndTermFocus ?
            this.sizes.minEndTermWideWidth : this.sizes.minEndTermWidth) );
          var spaceLeft =
            // Note: part 1 = minWidth, adjusted for not letting TheTerms shrink.
            Math.max(this.sizes.minWidth, this.width)
            - x - editWidth - this.termPadBordLR - this.padRight;

          t.width = editWidth + Math.max(0, spaceLeft) + this.termPadBordLR;
        }
        else {
          editWidth = this.isTermEditable(t) &&      // Not Edit-type => false..
            (t.editWidth || this.sizes.defaultEditWidth);  // .. else => Number.

          var maxWidth = t.maxWidth === undefined ? this.sizes.defaultMaxWidth :
            t.maxWidth;

          t.width = this.termWidth(t.str, t.minWidth, maxWidth, editWidth);
        }

        t.height = this.termHeight;
        t.x = x;
        t.y = this.padTop;

        x += t.width + this.termMarginHor;
      }

      // Also set TheTerms' total width now.
      x = x - this.termMarginHor + this.padRight;
      if (x > this.width)  this.$emit('width', this.width = x);  // Never shrink.
    },



    //
    // --- MOVING THE INPUT between Edit-Terms ---------------------------------
    //

    /**
     * While a user types in an Edit-type Term's input-element, its content
     * needs to be continously saved to the Term's `str`.
     * Because when the input-element moves to another Term, or when Vue updates
     * any other HTML/CSS and then automatically re-fills input content based
     * on `str` (which is used as initial value, and so also after any refresh),
     * then the correct content remains (or is re-placed) in the input.
     */
    onInputChange(index, str) {
      this.terms[index].str = str;
    },


    onKeyTab(index, str) {
      this.moveInputToNextEditTerm(index, str ? -1 : 1);
    },


    moveInputToNextEditTerm(index, step) {
      this.moveInputTo( this.getNextEditTermIndex(index, step) );
    },


    getNextEditTermIndex(index, step) {  // Step: 1 = forward, -1 = backward.
      // Get the indexes of all Edit-type Terms.
      var indexes = this.terms.reduce((indexes, term, index) => {
        if (this.isTermEditable(term))  indexes.push(index);
        return indexes;
      }, []);

      // Find index's position in this list, and move one left/right, cyclingly.
      var nextPos = indexes.indexOf(index) + step;
      if (nextPos >= indexes.length)  nextPos = 0;
      if (nextPos < 0)  nextPos = indexes.length - 1;
      return indexes[nextPos];
    },


    /**
     * When clicking on TheTerm's padding, to the right of the last real Term
     * (i.e. on the endTerm's margin), only: moves the input to endTerm.
     */
    onMousedown_div(event) {
      this.hidePopup();
      var clickX = event.pageX - this.$el.offsetLeft;  // Relative to element.
      if (this.endSpaceX <= clickX)  this.moveInputTo(this.terms.length - 1);
      else  this.focusInput();
    },


    onMousedown(index, event) {
      this.hidePopup();
      if (this.isTermEditable(this.terms[index]))  this.moveInputTo(index);
      else  this.initDrag(index, event);
    },


    /**
     * Moves the (only) <input>-elem. or vsmAutocomplete to the Term at `index`,
     * if it is an Edit-type term. If not, just re-focuses the current input.
     */
    moveInputTo(index, unsel = false) {
      if (this.isTermEditable(this.terms[index]))  this.inputIndex = index;

      // After Vue removes the old input, adds the new input, and fills it
      // with the value it finds in `term.str`: focus the new input.
      this.focusInput(unsel);
    },


    focusInput(unsel = false) {
      this.hidePopup();  // Hide ThePopup, if it would be visible.

      this.$nextTick(() => {  // Wait for Vue to update the DOM.
        var input = this.inputElement();
        input.focus();
        if (unsel)  input.selectionStart = input.selectionEnd =
          input.value.length;
      });
    },


    inputElement() {
      return this.$el.querySelector('.input');  // Non-reactive =>query it.
    },


    hidePopup() {
      this.popupLoc = -1;
    },



    //
    // --- TERM-TYPE CHANGING --------------------------------------------------
    //

    /**
     * Changes a Term's type: I->C->L->R->I, and EI->EC->EL->ER->EI;
     * and R->L->R, if `!allowClassNull`.
     */
    onCtrlMousedown(index) {
      var term = this.terms[index];
      var e = this.isTermEditable(term) ? 'E': '';

      // Switch Term-type to the next one in the cycle.
      var t = term.type;
      const tI = e + 'I',  tC = e + 'C',  tL = e + 'L',  tR = e + 'R';
      t = term.type =   t == tI ? tC :   t == tC ? tL :   t == tL ? tR :   tI;

      this.ensureTermIDs(term);

      // Skip types 'I' and 'C', if invalid classID.
      if (t == 'I'  && !term.classID  && !this.allowClassNull)  term.type = 'L';

      // Make a Ctrl+clicked Edit-type term always keep or get the input.
      // Also unselect after maybe multiple Ctrl+Clicks on it.  Or if it's
      // not an Edit-type term, then just refocus the current input-having Term.
      this.moveInputTo(index, true);

      if (!term.isEndTerm)  this.emitValue();
    },


    /**
     * Makes a given *non-Edit*-type Term have all the `...ID` properties that
     * are required for its type.
     */
    ensureTermIDs(term) {
      var t = term.type;
      if (t == 'R'            )  term.parentID = term.parentID || null;
      if (t == 'R' || t == 'I')  term.instID   = term.instID   || null;
      if (t != 'L'            )  term.classID  = term.classID  || null;
    },



    //
    // --- SETTING/UNSETTING FOCAL TERM ----------------------------------------
    //

    onAltMousedown(index) {
      var term = this.terms[index];

      if (!term.isEndTerm) {  // Don't make endTerm focal.
        if (term.isFocal)  this.$delete(term, 'isFocal');  // Make reactive too.
        else {
          this.terms.forEach(term => this.$delete(term, 'isFocal'));
          this.$set(term, 'isFocal', true);
        }
      }

      this.moveInputTo(index, true);

      if (!term.isEndTerm)  this.emitValue();
    },



    //
    // --- EMITTING CHANGE -----------------------------------------------------
    //

    /**
     * Construct and emits the current, publicly visible state of TheTerms.
     * It excludes any Term properties that are unused (e.g. classID after
     * changing Term-type from 'C' to 'L').
     */
    emitValue() {
      var terms2 = this.terms.map(term => {
        var term2 = Object.assign({}, term);
        this.cleanTermProps(term2);
        if (this.isTermEditable(term))  delete term2.str;
        if (!this.isTermEditable(term) || term.type == 'EI')  delete term2.type;
        delete term2.key;
        delete term2.x;  delete term2.width;
        delete term2.y;  delete term2.height;
        return term2;
      });
      terms2.pop();  // Remove the endTerm.
      this.$emit('change', terms2);
    },


    /**
     * Modifies the given `term` like this:
     *   + Deletes any IDs and other properties (dictID/descr) it should
     *     not have for its `.type`.
     *   + Enforces that a R-type term has either a both not-null `classID`
     *     and `parentID`, or a both null `classID` and `parentID`.
     *   + Deletes a `dictID`/`descr`/`style` property if it is empty.
     * This is used before emitting 'change',
     * and when the user enters/selects smth that then replaces an Edit-term.
     */
    cleanTermProps(term) {
      var t = term.type;
      if (t == 'R') {
        if (!term.classID || !term.parentID) term.classID = term.parentID = null;
      }
      else {
        delete term.parentID;
        if (t != 'I') {
          delete term.instID;
          if (t != 'C')  delete term.classID;
        }
      }

      var notIC = t != 'I' && t != 'C';  // (That includes Edit-type Terms).
      if (notIC || !term.dictID)  delete term.dictID;
      if (notIC || !term.descr )  delete term.descr;
      if (         !term.style )  delete term.style;

      delete term.backup;
    },



    //
    // --- START EDITING EXISTING TERMS, and CANCELING THE EDITING -------------
    //

    /**
     * - On doubleclick on Edit-type Term, shows ThePopup.
     * - On doubleclick on non-Edit-type Term, converts it to an Edit-type Term.
     */
    onDblclick(index) {
      if (this.isTermEditable(this.terms[index]))  this.popupLoc = index;
      else {
        this.makeTermEditable(index);
        this.moveInputTo(index);  // This also hides a possibly visible ThePopup.
        this.setTermCoordinates(index);
        this.emitValue();
      }
    },


    /**
     * Converts a non-Edit-type Term to an Edit-type Term.
     * Hereby copies the Term's various `...id`s etc. into `term.backup`,
     * so that the Term can be restored by subsequently pressing Esc.
     */
    makeTermEditable(index) {
      var term = this.terms[index];

      // Note: `.backup` needs not be reactive, so we don't use `this.$set()`.
      term.backup = { type: term.type, str: term.str };
      ['classID', 'instID', 'parentID'] .forEach(s => {
        if (term[s] !== undefined)  term.backup[s] = term[s];
      });

      term.type = 'E' + term.type;
    },


    /**
     * Restores an Edit-type Term that was previously a filled-in Term, after
     * an Esc-press on a plain input, or a vsmAC-input with closed matches-list.
     */
    onKeyEsc(index) {
      this.hidePopup();

      var term = this.terms[index];
      if (this.isTermEditable(term) && term.backup) {
        this.moveInputToNextEditTerm(index, 1);  // Do this before changing type.

        Object.assign(term, term.backup);
        delete term.backup;

        this.setTermCoordinates(index);
        this.emitValue();
      }
    },



    //
    // --- BACKSPACE, REMOVING TERM BEFORE, and INSERTING TERM AFTER -----------
    //

    /**
     * This is called only on an empty Edit-Term.
     * If in first Term, does nothing.
     * Else, makes the Term before it editable (if needed), and focuses it.
     */
    onKeyBksp(index) {
      this.hidePopup();

      if (!index)  return;

      // Ensure endTerm (if that's where we're at) releases its claim to
      // wide-width, before moving the input to a new place.
      this.inputElement().blur();

      index = --this.inputIndex;
      var change = !this.isTermEditable(this.terms[index]);

      if (change)  this.makeTermEditable(index);
      this.focusInput(true);
      this.setTermCoordinates(index);
      if (change)  this.emitValue();
    },


    /**
     * Deletes a Term. Then moves input+focus to right after it (if Edit-Term),
     * or else right before it (if Edit-Term), or else the first next Edit-Term.
     * If on the endTerm, just resets its type to 'EI'.
     */
    onKeyCtrlDelete(index) {
      this.hidePopup();

      var term = this.terms[index];
      if (term.isEndTerm) {
        term.type = 'EI';
        return this.focusInput();
      }

      var index2 = this.isTermEditable(this.terms[index + 1]) ? index :
        (index && this.isTermEditable(this.terms[index - 1])) ? index - 1 :
          this.getNextEditTermIndex(index, 1) - 1;

      this.deleteTerm(index);
      this.moveInputTo(index2, true);
      this.setTermCoordinates(index);
      this.emitValue();
    },


    deleteTerm(index) {
      if (index == this.inputIndex) {
        this.inputElement().blur(); // Prevent that detached input emits change!
      }
      this.terms.splice(index, 1);
    },


    /**
     * Adds a new Edit-Instance Term behind the current Edit-Term and focuses it.
     */
    onKeyCtrlEnter(index) {
      var term  = this.terms[index];
      var term2 = this.newTerm({ type: 'EI', key: ++lastKey });
      if (term.isEndTerm) {
        this.$delete(term, 'isEndTerm');
        term2.isEndTerm = true;
      }

      this.terms.splice(index + 1, 0, term2);
      this.moveInputTo(index + 1);  // Updates inputIndex; focuses at nextTick.
      this.setTermCoordinates(index); // Not `index+1`: it may need to update a..
      this.emitValue();               // ..former ex-endTerm(@index)'s width.
    },


    /**
     * Ensures that certain properties are set on a new Term, before it is added
     * to `this.terms`. This makes that these properties are reactive.
     * Like this, e.g. `setTermCoordinates()` doesn't need to use `this.$set()`
     * to change properties on terms, just because a single Term may be new.
     */
    newTerm(term) {
      return Object.assign({ x: 0, y: 0, width: 0, height: 0 }, term);
    },



    //
    // --- MOVING EDIT-TYPE TERMS LEFT/RIGHT -----------------------------------
    //

    onKeyAltUp(index) {
      this.moveTerm(index, index - 1);
    },


    onKeyAltDown(index) {
      this.moveTerm(index, index + 1);
    },


    /**
     * Moves an Edit-type Term to a new position.
     * Arg. `to` is the position where the Term will be reinserted in the array
     * `this.terms`, after it has been extracted/deleted from the pos. `from`.
     */
    moveTerm(from, to) {
      this.hidePopup();

      // Abort if at endTerm, or if less than 2 real terms.  (Note: `.length`..
      var n = this.terms.length;                    // ..includes the endTerm).
      if (from == n - 1  ||  n < 3)  return;

      /* Also make the `to`-index cycle. E.g. these four examples:
            (orig. positions at each one's start):    0 1 2 (3), n=4
         - Alt+Down on 0: move term at 0 to pos 1: => 1 0 2 (3) (3=endTerm)
         - Alt+Down on 2: move term at 2 to pos 0: => 2 0 1 (3) <- cycle right
         - Alt+Up   on 2: move term at 2 to pos 1: => 0 2 1 (3)
         - Alt+Up   on 0: move term at 0 to pos 2: => 1 2 0 (3) <- cycle left */
      if (to < 0)  to = n - 2;
      else if (to > n - 2)  to = 0;

      var terms2 = this.terms.slice(0, from).concat(this.terms.slice(from + 1));
      terms2.splice(to, 0, this.terms[from]);

      this.inputIndex = to; // (Don't use `moveInputTo()` for moving terms, as..
      this.focusInput();    //  ..it'd try backing up the label at old position).

      this.setTermCoordinates(Math.min(from, to), terms2);
      this.terms = terms2;

      this.emitValue();
      this.$emit('move', { from, to });
    },



    //
    // --- ENTERING TERMS ------------------------------------------------------
    //

    onPlainEnter(index) {  // Can be called on ER/EL-type Terms.
      var term = Object.assign(
        {}, this.terms[index], { str: this.terms[index].str }
      );
      term.type = term.type.replace('E', '');

      // Preserve or add all required IDs, if it's an 'R'-type Term.
      this.ensureTermIDs(term);

      this.afterEnter(index, term);
    },


    onItemLiteralSelect(index) {  // Can be called on EI/EC-type Terms.
      if (!this.advancedSearch) {
        if (this.allowClassNull)
          this.onItemSelect(index, { str: this.terms[index].str, id: null });
      }
      else this.launchAdvancedSearch(index);
    },


    onKeyShiftEnter(index) {  // Can be called on all Edit-type Terms.
      if (this.advancedSearch)  this.launchAdvancedSearch(index);
    },


    launchAdvancedSearch(index) {
      var term = this.terms[index];
      var qOpt = Object.assign({}, term.queryOptions);
      delete qOpt.sort;  // Don't let adv-search use this; according to the spec.

      this.advancedSearch(
        {
          str:            term.str,
          termType:       term.type.replace('E', ''),
          vsmDictionary:  this.vsmDictionary,
          queryOptions:   qOpt,
          allowClassNull: this.allowClassNull
        },
        match => this.onItemSelect(index, match)
      );
    },


    onItemSelect(index, match) {  // Is called only for Term-types EI/EC.
      var term = this.mergeMatchObject(index, match);
      this.afterEnter(index, term);
    },


    mergeMatchObject(index, match) {
      if (!match)  return;

      // Make a copy of the Edit-type Term at `index`; then add/overwrite/delete
      // certain properties. This makes it keep properties like `minWidth` etc.
      // + Note: the Edit-Term may have been a different *non*-Edit-Term earlier,
      //       so it may have `...ID`/`style` etc prop.s that should be deleted.
      // + Note 2: for Term-type determination, see the spec.
      // + Note 3: here we set all properties; `afterEnter` cleans up what is
      //       not applicable, afterwards.
      var term = this.terms[index];
      return Object.assign({}, term, {
        type: match.termType ||
          (match.id === '' ? 'R' : term.type == 'EC' ? 'C' : 'I'),
        str: match.str,
        classID:  match.id || null,
        instID:   null,
        parentID: match.parentID || null,
        style:  match.style,
        dictID: match.dictID,
        descr:  match.descr
      });
    },


    /**
     * Puts the given `term` in place of the one at `index`,
     * and adds a new endTerm if endTerm was there.
     * Also cleans up `term`'s data, and aborts if an invalid term is given.
     */
    afterEnter(index, term) {
      if (!term)  return;
      this.cleanTermProps(term);  // Clean up properties that are not applicable.

      if (term.classID === null  &&  !this.allowClassNull  &&  term.type != 'R')
        return;


      if (term.isEndTerm) {
        delete term.isEndTerm;
        var newEndTerm = this.newTerm(
          { isEndTerm: true, type: 'EI', key: ++lastKey });
        this.terms.push(newEndTerm);
      }

      this.moveInputToNextEditTerm(index, 1);
      this.$set(this.terms, index, term);

      this.setTermCoordinates(index);
      this.emitValue();
    },



    //
    // --- DRAGGING A TERM -----------------------------------------------------
    //

    onCtrlShiftMousedown(index, event) {
      this.hidePopup();
      this.initDrag(index, event);
    },


    initDrag(index, event) {  // Called by `onMousedown()`, see above.

      // Calculation of mouse-coordinates of `event`, relative to `term`'s
      // top left corner, or the Term's drag-placeholder's top left corner.
      // This also works when the page is scrolled, and  when the VsmBox has
      // any absolute-positioned ancestor-elements.
      // + Note: mouse-coo.s `clientX/Y` are relative to a possibly scrolled
      //   viewport, and so is `getBoundingClientRect()` => cancels out nicely.
      // + Note that `term.x/y` change along with changing placeholder position.
      var term = this.terms[index];
      var theTerms = this.$el.getBoundingClientRect();
      theTerms = { x: ~~theTerms.left,  y: ~~theTerms.top };
      var mouseCoosRelToTerm = event => ({
        x: event.clientX - theTerms.x - term.x,
        y: event.clientY - theTerms.y - term.y
      });

      var dragOffset = mouseCoosRelToTerm(event); // =Pos. of mouse inside Term.
      var threshSqr = Math.pow(this.sizes.termDragThreshold, 2);
      var done = false;


      var hook = func => {  // Hooks/unhooks events to the whole browser window.
        func('mousemove', processMousemove);
        func('mouseup',   event => { processMousemove(event);  stopDrag() }),
        func('blur',      stopDrag);
      };


      // Function for setting/restoring the cursor to 'grabbing' on the whole
      // page. Because the mouse may leave the Term.
      var origCursor = document.body.style.cursor;
      var setGrabCursor = (on = true) => {
        document.body.style.cursor = on ? 'grabbing' : origCursor;
      };


      var processMousemove = event => {
        if (done)  return;  // Dismiss stale, queued events after drag finished.
        var loc = mouseCoosRelToTerm(event);

        // If not yet dragging (because mousemove-distance threshold not yet
        // reached), then check if the mouse is past the threshold now.
        // If not, abort; if so, start dragging and make the first move response.
        if (this.dragIndex < 0) {
          var dx = loc.x - dragOffset.x;
          var dy = loc.y - dragOffset.y;
          if (dx * dx + dy * dy < threshSqr)  return;  // Abort if < threshold.

          this.dragIndex = index;
          this.$set(term, 'drag', { x: term.x,  y: term.y });
          this.inputElement().blur();  // Makes any autocomplete-list hidden.
          setGrabCursor();
        }

        // Proceed with dragging.
        term.drag.x = Math.min(Math.max(   this.padLeft - term.width,
          term.x + loc.x - dragOffset.x),  this.endSpaceX);
        term.drag.y = Math.min(Math.max(   term.y - term.height,
          term.y + loc.y - dragOffset.y),  term.y + term.height);

        // Calculate where Term/placeholder belongs now, based on new mouse pos.
        for (var to = 0; to < this.terms.length - 1; to++) {
          var t = this.terms[to];
          if (loc.x + term.x <= t.x + t.width / 2)  break;
        }
        if (to > index)  to--;

        // Move the Term/placeholder to a new index, if needed.
        if (index != to) {
          var from = index;
          var inputKey = this.terms[this.inputIndex].key;

          var terms2 = this.terms.slice(0, from)
            .concat(this.terms.slice(from + 1));
          terms2.splice(to, 0, term);

          this.setTermCoordinates(Math.min(from, to), terms2);
          this.terms = terms2;
          this.dragIndex = index = to;  // Updates our local `index` too!
          this.inputIndex = this.terms.findIndex(term => term.key == inputKey);
          this.emitValue();
        }
      };


      var stopDrag = () => {
        done = true;
        setGrabCursor(false);
        hook(window.removeEventListener);
        this.dragIndex = -1;
        this.$delete(term, 'drag');
      };


      hook(window.addEventListener);
    },



    //
    // --- SHOWING/HIDING THEPOPUP ---------------------------------------------
    //
    /* eslint no-unused-vars: ['error',
        { 'argsIgnorePattern': '^index|str|match|event$' }] */

    onClick(index) {
      //// To verify & test: ----
      //var term = this.terms[index];
      //this.popupLoc = this.isTermEditable(term) ? -1 : index;
    },


    onMouseenter(index) {

    },


    onMouseleave(index) {

    },


    onListOpen(index) {
      this.hidePopup();
    },


    //
    // --- ENDTERM WIDTH ----------------------------------------------------

    onFocus(index) {
      this.hasEndTermFocus = index == this.terms.length - 1;
    },


    onBlur(index) {
      if (index == this.terms.length - 1)  this.hasEndTermFocus = false;
    }
  }
};


///function J(obj) { console.log(JSON.parse(JSON.stringify(obj))) }  0&&J;

</script>


<style scoped>
  .terms {
    position: relative;
    box-sizing: border-box;
    padding: 0 2px 2px 2px;
    background-color: inherit;
  }

  span.ruler {  /* For measuring Term string-pixel-width */
    position: absolute;
    line-height: normal;
    white-space: nowrap;
    visibility: hidden;
  }

  .term {
    position: absolute;
    box-sizing: border-box;
    display: inline-block;
    padding: 0 3px;
    margin: 0 2px;  /* Is later zero'ed, but abs. positioning uses this value */
    overflow: hidden;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
    border: 1px solid transparent;
    border-radius: 2px;
  }
  .term >>> sup,
  .term >>> sub {
    position: relative;
    top: -0.4em;
    vertical-align: baseline;
  }
  .term >>> sub {
    top: 0.4em;
  }
  .term:not(.edit) {
    -moz-user-select: none;
    -khtml-user-select: none;
    -webkit-user-select: none;
    -o-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .term:not(.nofade),
  .term:not(.nofade):hover {
    transition: border-color 0.1s ease;
  }
  .term >>> .vsm-autocomplete input {
    background-color: transparent;
  }

  .edit {
    color: #000;
    cursor: text;
    background-color: inherit;
  }
  .edit.inp {
    overflow: visible;  /* Makes autocomplete results visible */
  }
  .edit:not(.inp) {
    text-overflow: clip;  /* No ellipsis for Edit-Terms without <input> elem. */
  }

  .inp >>> .vsm-autocomplete .list {
    margin-top: 3.5px;
  }

  .inst {
    color: #1c2a47;
    background-color: #e2e6f0;
    border-color: #b1bed8;
  }
  .inst:hover {
    background-color: #e1e5ef;
    border-color: #95a5c7;
  }

  .edit:not(.end) {
    border-color: #c4c4c4;
  }
  .edit:hover {
    border-color: #b4b4b4;
  }

  /* `.inp.focus`: a VsmBox that just displays a stored VSM-sentence won't show
     a border around the endTerm (that has the input then) when not focused. */
  .end.inp.focus,
  .end:hover {
    border-color: #f0f0f0;
  }
  .end.inp.focus:hover {
    border-color: #ebebeb;
  }
  .end:not(.inp):not(.nofade):hover {
    transition-duration: 0.18s;
  }

  .ref:not(.end),
  .ref.end.inp {
    border-style: dashed;
  }
  .ref.end.inp {
    border-color: #b1bed8;
  }
  .ref.end.inp:hover {
    border-color: #95a5c7;
  }

  .class:not(.edit) {
    color: #2a2a05;
    background-color: #f9f2b9;
    border-color: #e5c547;
  }
  .class:not(.edit):hover {
    background-color: #f8f1b8;
    border-color: #dab43f;
  }
  .class.edit:not(.end),
  .class.edit.inp {
    border-color: #ebd262;
  }
  .class.edit:not(.end):hover,
  .class.edit.inp:hover {
    border-color: #e5c547;
  }

  .lit:not(.edit) {
    color: #200505;
    background-color: #f0e2e6;
    border-color: #d8b1ba;
  }
  .lit:not(.edit):hover {
    background-color: #efe1e5;
    border-color: #c795a5;
  }
  .lit.edit:not(.end),
  .lit.edit.inp {
    border-color: #e1c2c7;
  }
  .lit.edit:not(.end):hover,
  .lit.edit.inp:hover {
    border-color: #dfb1b9;
  }

  .term >>> input.input {  /* $'s undo automatic 'user agent stylesheets' */
    width: 100%;
    height: 100%;
    padding: 0;        /* $ */
    cursor: text;
    border: 0;         /* $ */
    outline: none;     /* $ */
    box-shadow: none;  /* $ */
  }
  .term >>> .input::placeholder {
    color: #777;
  }
  .term >>> .item:not(.item-state-active).item-type-literal {
    color: #888;
  }

  .term.drag {
    z-index: 3;
    text-overflow: clip;
    opacity: 0.65;
  }
  .term.drag,
  .term.drag >>> input {
    cursor: grabbing;
  }

  .drag-placeholder {
    margin: 0;
    background-color: #e9e9e9;
    border-color: #ebebeb;
  }

  /* * */
  .focal::before {
    position: absolute;
    top: 0.5px;
    right: 0;
    bottom: 0.5px;
    left: 0;
    width: 100%;
    overflow: visible;
    content: " ";
    border-top: 1.5px dotted #aaa;
  }

  /* * */

</style>
