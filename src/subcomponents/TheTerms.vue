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
      :fresh-list-delay="freshListDelay"
      :max-string-lengths="maxStringLengths"
      :has-item-literal="!!(allowClassNull || advancedSearch)"
      :custom-item="customItem"
      :custom-item-literal="customItemLiteral2"
      unselectable="on"
      @input="onInput"
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
      @item-select="insertFromMatch"
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
      :index="popupLoc"
      :term="terms[popupLoc]"
      :vsm-dictionary="vsmDictionary"
      :sizes="sizes"
      :allow-class-null="allowClassNull"
      :term-margin="popupTermMargin"
      :custom-popup="customPopup"
      :term-copy="termCopy"
      :term-paste="termPaste"
      @mouseenter="onMouseenter_popup"
      @mouseleave="onMouseleave"
      @edit="onDblclick"
      @undo-edit="onKeyEsc"
      @toggle-focal="onAltMousedown"
      @insert="onInsertBefore"
      @remove="onKeyCtrlDelete"
      @set-type="onSetType"
      @copy="onCopy"
      @copy-ref="onCopyRef"
      @paste="onPaste"
      @mousedown.native.stop="x => x"
    />
  </div>
</template>


<script>
import Term from './Term.vue';
import ThePopup from './ThePopup.vue';
import sanitizeHtml from './sanitizeHtml.js';
import to from './termOperations.js';
import stringStyleHtml from 'string-style-html';
const defaultFontSize = 11;  // Equals `.vsm-box`'s CSS-value 'font-size'.


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
    freshListDelay: {
      type: Number,
      default: 0
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
    },
    customItem: {
      type: [Function, Boolean],
      default: false
    },
    customItemLiteral: {
      type: [Function, Boolean],
      default: false
    },
    customTerm: {
      type: [Function, Boolean],
      default: false
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
    dragIndex: -1,  // When >= 0, it is the index of a currently dragged Term.
    enablePopup: true,  // Helps to prevent showing ThePopup in an edge case.
    timerPopupHide: 0,  // = a timer-handle, only while a Popup-hide timer runs.
    timerPopupShow: 0   // (Similar).
  }; },


  computed: {
    height() {
      return this.termHeight + this.padTop + this.padBottom;
    },


    /**
     * Makes vsm-autocomplete's default item-literal `titleStr` more informative,
     * applies a `customItemLiteral` function prop if given, and
     * appends HTMLto show `advancedSearch`'s hotkey Shift+Enter, if needed.
     */
    customItemLiteral2() {
      var f = data => {
        // 1) Override vsmAC's `strTitle` for the item-literal.
        data.strs.strTitle =
          this.advancedSearch ? 'Advanced search' : 'Create new concept';

        // 2) If no `customItemLiteral` changes `str`, set an augmented default.
        if (!this.customItemLiteral)  data.strs.str =
          (this.advancedSearch ? 'Search' : 'Create') + ` '${data.strs.str}'`;

        // 3) Else, now give `customItemLiteral` control over both str&strTitle.
        else  data.strs = this.customItemLiteral(data);
        return data.strs;
      };

      // 4) Finally, if advSrch is available then show the hotkey for it, by..
      return !this.advancedSearch ? f : (   // ..wrapping the above function..
        data => {                           // ..into a new one.
          data.strs = f(data);
          data.strs.str += '<span class="hotkey">Shift+Enter</span>';
          return data.strs;
        }
      );
    },


    popupTermMargin() {
      var i = this.popupLoc;
      return i < 0 ? {} : {
        left: i ? this.termMarginHor : this.padLeft,
        right: i < this.terms.length - 1 ? this.termMarginHor : this.padRight
      };
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
    // --- DIMENSIONS, TERM POSITIONING, and EXTRA TERM PROPERTIES -------------
    //

    /**
     * We make `measureSizes()` access the ruler-element in this separate func.,
     * only so that the tests can override it and insert custom functionality.
     */
    getRuler() {
      return this.$refs.ruler;
    },


    /**
     * This measures some sizes set by CSS, that will not change after creation.
     */
    measureSizes() {
      var style = getComputedStyle(this.$el);  // --1-- TheTerms's style.
      var num  = s    => +s.replace(/px$/, '');
      var calc = side => num( style['padding-' + side] );
      this.padTop    = calc('top');
      this.padRight  = calc('right');
      this.padBottom = calc('bottom');
      this.padLeft   = calc('left');

      this.bkgrColor = style['background-color'];

      var ruler = this.getRuler();
      style = getComputedStyle(ruler);  // --2-- Term's style.
      calc = side =>
        num(style['padding-' + side]) +
        num(style['border-' + side + '-width']);
      this.termPadBordLR = calc('left') + calc('right');

      calc = side => num(style['margin-' + side]);
      this.termMarginHor = calc('left') + calc('right');

      ruler.innerHTML = 'W';  // Make it not empty, in order to measure height.
      this.termHeight = ruler.offsetHeight;

      this.sizes.widthScale = this.sizes.widthScale ||
        num(style['font-size']) / defaultFontSize;
    },


    /**
     * Calculates (using the DOM) how wide a Term should be made (including
     * padding and borders), so that it can contain its label (= the HTML that
     * results from its `str` with its `style` applied).
     * If needed, the string is hereby trimmed to be only `maxStrWidth` px wide
     * (this width excludes Term's padding and borders).
     * Notes:
     * + Term-width = allocated string-width + Term's padding & borders.
     * + If an `editStrWidth` is given, it overrides the given min/max-widths.
     * + Text-trimming happens via CSS's `text-overflow:ellipsis`.
     * + Instead of using `offsetWidth` which is a rounded-up/down integer,
     *   we get the full-precision width, and then always round it up.
     *   Like this, e.g. for a string (that will not be trimmed and) that is
     *   70.23px wide, the Term's width will be set so that the contained string
     *   gets 71px space, and not 70px (which would 'text-overflow'-truncate it).
     */
    termWidth(label, minStrWidth, maxStrWidth, editStrWidth = false) {
      var f = w => Math.ceil(w * this.sizes.widthScale) + this.termPadBordLR;
      var r = this.$refs.ruler;
      r.innerHTML = label;
      r.style =
        editStrWidth ?       `width:${f(editStrWidth)}px;` :
          (minStrWidth ? `min-width:${f( minStrWidth)}px;` : '') +
          (maxStrWidth ? `max-width:${f( maxStrWidth)}px;` : '');
      var w = Math.ceil(r.getBoundingClientRect().width);  // Not `offsetWidth`.
      r.style = '';
      return w;
    },


    initForNewTerms() {
      var terms = this.origTerms.map(term => to.prepToReceive(term));
      terms.push(to.newEndTerm());

      // Determine which Editable Term (or endTerm) gets the only <input>-elem.
      for (var i = 0; i < terms.length; i++) {
        if (to.isEditable(terms[i]))  { this.inputIndex = i;  break }
      }

      this.setTermCoordinates(0, terms);

      // Assign all `terms` at once, making all added sub-prop.s Vue-reactive.
      this.terms = terms;
    },


    /**
     * (Re-)Calculates coordinates & dimensions for Terms, and related UI-data.
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
          editWidth = to.isEditable(t) &&            // Not Edit-type => false..
            (t.editWidth || this.sizes.defaultEditWidth);  // .. else => Number.

          var maxWidth = t.maxWidth === undefined ? this.sizes.defaultMaxWidth :
            t.maxWidth;

          t.label = this.termLabel(t, i);
          t.width = this.termWidth(t.label, t.minWidth, maxWidth, editWidth);
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


    /**
     * Calculates the text/HTML `label` for a Term, based on its text-`str`,
     * by applying `style` and a `customTerm()` function, if these exist.
     * This must be done before measuring the visual width needed for the Term.
     */
    termLabel(term, i) {
      var strs = {  // Use `strs.str`, for uniformity among customization funcs.
        str: stringStyleHtml(term.str, term.style)
      };

      if (this.customTerm && !to.isEditable(term))  strs = this.customTerm(
        { strs,  index: i,  type: term.type,
          term: to.prepToEmit(term),
          vsmDictionary: this.vsmDictionary }
      );

      return sanitizeHtml(strs.str);  // Secure the UI against third-party data.
    },



    //
    // --- ENDTERM WIDTH -------------------------------------------------------
    //

    onFocus(index) {
      this.hasEndTermFocus = index == this.terms.length - 1;
    },


    onBlur(index) {
      if (index == this.terms.length - 1)  this.hasEndTermFocus = false;
    },



    //
    // --- MOVING THE INPUT between Edit-Terms ---------------------------------
    //

    /**
     * While a user types in an Edit-type Term's input-element, its content
     * needs to be continuously saved to the Term's `str` + its derived `label`.
     * Because when the input-element moves to another Term, or when Vue updates
     * any other HTML/CSS and then automatically re-fills input content based
     * on `str` (which is used as initial value, and so also after any refresh),
     * then the correct content remains (or is re-placed) in the input-less
     * Edit-Term.
     */
    onInput(index, str) {
      this.hidePopup();

      var term = this.terms[index];
      term.str   = str;
      term.label = sanitizeHtml(str);
    },


    onKeyTab(index, str) {
      this.moveInputToNextEditTerm(index, str ? -1 : 1);
    },


    moveInputToNextEditTerm(index, step) {
      this.moveInputTo( this.getNextEditTermIndex(index, step) );
    },


    getNextEditTermIndex(index, step) {  // `step`: 1 = rightward, -1 = leftward.
      var n = this.terms.length;
      var pos = index;
      while (1) {                   // eslint-disable-line no-constant-condition
        if      ((pos += step) >= n)  pos = 0;      // Search, moving one step..
        else if ( pos          <  0)  pos = n - 1;  // ..right/left, cyclingly.
        if (pos == index || to.isEditable(this.terms[pos]))  return pos;
      }
    },


    /**
     * When clicking on TheTerms's padding, to the right of the last real Term
     * (i.e. on the endTerm's margin), only: move the input to endTerm.
     * Else, just move the focus to the current input.
     * Note: clicks on ThePopup are ignored via its `@mousedown.native.stop`.
     */
    onMousedown_div(event) {
      var rect = this.$el.getBoundingClientRect();
      var clickX = event.clientX - rect.left;
      if (this.endSpaceX <= clickX)  this.moveInputTo(this.terms.length - 1);
      else  this.focusInput();
    },


    onMousedown(index, event) {
      this.hidePopup();
      if (to.isEditable(this.terms[index]))  this.moveInputTo(index);
      else  this.initDrag(index, event);
    },


    /**
     * Moves the (only) <input>-elem. or vsmAutocomplete to the Term at `index`,
     * if it is an Edit-type term. If not, just re-focuses the current input.
     */
    moveInputTo(index, unsel = false) {
      this.hidePopup();

      if (to.isEditable(this.terms[index]))  this.inputIndex = index;

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



    //
    // --- CHANGING TERM-TYPE --------------------------------------------------
    //

    /**
     * Changes a Term's type to the next one in a cycle (see `to.cycleType`).
     */
    onCtrlMousedown(index) {
      var term = this.terms[index];
      to.cycleType(term, this.allowClassNull, this);

      // Make a Ctrl+Clicked Edit-type term always keep or get the <input>.
      // Also unselect after maybe multiple Ctrl+Clicks on it.  Or if it is
      // not an Edit-type term, then just refocus the current input-having Term.
      this.moveInputTo(index, true);

      if (!term.isEndTerm)  this.emitValue();
    },



    //
    // --- SETTING/UNSETTING FOCAL TERM ----------------------------------------
    //

    /**
     * Toggles a Term's state of being 'focal'.
     * It ensures that only one Term is focal, and will not make endTerm focal.
     */
    onAltMousedown(index) {
      var term = this.terms[index];

      if (!term.isEndTerm) {
        to.makeFocal(term, !term.isFocal, this);
        if (term.isFocal) {
          this.terms.forEach(t => t == term || to.makeFocal(t, false, this));
        }
      }

      this.moveInputTo(index, true);

      if (!term.isEndTerm)  this.emitValue();
    },



    //
    // --- EMITTING CHANGE -----------------------------------------------------
    //

    /**
     * Constructs and emits the current, publicly visible state of TheTerms,
     * excluding the endTerm. Term-properties are pruned in 'termOperations.js'.
     */
    emitValue() {
      this.$emit('change', this.terms .slice(0, -1) .map(to.prepToEmit));
    },



    //
    // --- START EDITING TERMS, and CANCELING THE EDITING ----------------------
    //

    /**
     * - On doubleclick on Edit-type Term, shows ThePopup.
     * - On doubleclick on non-Edit-type Term, converts it to an Edit-type Term.
     */
    onDblclick(index) {
      if (to.isEditable(this.terms[index]))  this.showPopup(index);
      else {
        this.makeTermEditable(index);
        this.moveInputTo(index);  // This also hides a possibly visible ThePopup.
        this.setTermCoordinates(index);
        this.emitValue();
      }
    },


    /**
     * Replaces a non-Edit-type Term by a derived Edit-type Term. It adds a
     * `backup` property to the Edit-Term, to enable restoring the original one.
     */
    makeTermEditable(index) {
      this.$set(this.terms, index, to.createEditTerm(this.terms[index]));
    },


    /**
     * Restores an Edit-type Term that was previously not-Edit-type.
     * This function is called after an Esc-press on a plain input,
     * or on a vsmAutocomplete-input with closed selection-list.
     */
    onKeyEsc(index) {
      this.hidePopup();

      var term = this.terms[index];
      if (to.isEditable(term) && term.backup) {
        this.moveInputToNextEditTerm(index, 1);  // Do this before changing type.

        this.$set(this.terms, index, to.createRestoredTerm(term));
        this.setTermCoordinates(index);
        this.emitValue();
      }
    },



    //
    // --- BACKSPACE INTO TERM BEFORE, REMOVING, and INSERTING TERM AFTER ------
    //

    /**
     * This is called only on an empty Edit-Term.
     * - If on first Term, does nothing.
     * - Else, makes the Term before it editable (if needed), and focuses it.
     */
    onKeyBksp(index) {
      this.hidePopup();

      if (!index)  return;

      // Ensure that endTerm (if that's where we're at) releases its claim to
      // wide-width, before moving the input to a new place.
      // (Note: we don't use `this.inputElement().blur()`, as in Firefox that
      //  can let the Backspace-event bubble up and cause a Go-To-Prev.-Page).
      this.hasEndTermFocus = false;

      index = --this.inputIndex;
      var change = !to.isEditable(this.terms[index]);

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
        to.setType(term, 'EI', this);
        return this.focusInput();
      }

      var index2 = to.isEditable(this.terms[index + 1]) ? index :
        (index && to.isEditable(this.terms[index - 1])) ? index - 1 :
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
      this.insertEmptyTerm(index);
    },


    insertEmptyTerm(index, after = 1) {  // `after`: 1/0 to insert after/before.
      var term  = this.terms[index];
      var term2 = to.newEditTerm(term.isEndTerm && after);

      if (after)  to.unsetAsEndTerm(term, this);
      else        this.hasEndTermFocus = false; // => Release wide-claim, if any.

      this.terms.splice(index + after, 0, term2);
      this.moveInputTo(index + after);  // Update inputIndex, focus at nextTick.
      this.setTermCoordinates(index); // Not `index+1`: it may need to update a..
      this.emitValue();               // ..former ex-endTerm(@index)'s width.
    },


    //
    // --- MOVING EDIT-TYPE TERMS LEFT/RIGHT, and general moving ---------------
    //

    onKeyAltUp(index) {
      this.moveEditTerm(index, index - 1);
    },


    onKeyAltDown(index) {
      this.moveEditTerm(index, index + 1);
    },


    /**
     * Moves an Edit-type Term to a new position.
     * Arg. `to` is the position where the Term will be reinserted in the array
     * `this.terms`, after it has been extracted/deleted from the pos. `from`.
     */
    moveEditTerm(from, to) {
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
      if      (to < 0    )  to = n - 2;
      else if (to > n - 2)  to = 0;

      this.moveTerm(from, to, true);
    },


    /**
     * Helper of `moveEditTerm()` and of `initDrag().processMousemove()`.
     */
    moveTerm(from, to, inputToTo = false) {
      var terms2 = this.terms.slice(0, from).concat(this.terms.slice(from + 1));
      terms2.splice(to, 0, this.terms[from]);

      if (inputToTo) {
        this.inputIndex = to; // (Don't use `moveInputTo()` for moving terms, ..
        this.focusInput();    // ..as it'd try backing up the label at old pos).
      }

      this.setTermCoordinates(Math.min(from, to), terms2);
      this.terms = terms2;

      this.emitValue();
      this.$emit('move', { from, to });
    },



    //
    // --- ENTERING TERMS (Filling in Edit-Terms) ------------------------------
    //

    onPlainEnter(index) {  // Can be called on ER/EL-type Terms, only.
      this.hidePopup();
      this.insertTerm(index, to.createRorLTerm(this.terms[index]));
    },


    onItemLiteralSelect(index) {  // Can be called on EI/EC-type Terms, only.
      this.hidePopup();

      if (this.advancedSearch)  this.launchAdvancedSearch(index);
      else if (this.allowClassNull) {
        // Pretend an item with id=null was selected. =>Results in classID=null.
        this.insertFromMatch(index, { str: this.terms[index].str, id: null });
      }
    },


    onKeyShiftEnter(index) {  // Can be called on all Edit-type Terms.
      this.hidePopup();
      if (this.advancedSearch)  this.launchAdvancedSearch(index);
    },


    launchAdvancedSearch(index) {
      var term = this.terms[index];
      var qOpt = to.clone(term.queryOptions || {});
      delete qOpt.sort;  // Don't let adv-search use this; according to the spec.

      this.$nextTick(() =>  // Let VsmBox update before calling an external func.
        this.advancedSearch(
          { str:            term.str,
            termType:       term.type.replace('E', ''),
            vsmDictionary:  this.vsmDictionary,
            queryOptions:   qOpt,
            allowClassNull: this.allowClassNull
          },
          match => this.insertFromMatch(index, match)
        ));
    },


    /**
     * Creates & fills in a Term, based on a match-object (or similar Object)
     * as defined in 'vsm-dictionary' and 'vsm-box''s specs.
     */
    insertFromMatch(index, match) {
      if (match)
        this.insertTerm(index, to.createTermFromMatch(this.terms[index], match));
    },


    /**
     * Puts the given (already cleanded) `term` in place of the one at `index`,
     * and adds a new endTerm if endTerm was there.
     * Aborts if invalid data is given.
     */
    insertTerm(index, term) {
      if (! term || !term.str ||
        (term.classID === null  &&  !this.allowClassNull  &&  term.type != 'R'))
        return;

      if (term.isEndTerm) {
        to.unsetAsEndTerm(term, this);
        this.terms.push(to.newEndTerm());
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

      // Calculation of mouse-coordinates of `event`:  relative to `term`'s
      // top left corner, or the Term's drag-placeholder's top left corner.
      // This also works when the page is scrolled, and when the VsmBox has
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

      var dragOffset = mouseCoosRelToTerm(event); // =Mousedown-pos. inside Term.
      var threshSqr = Math.pow(this.sizes.termDragThreshold, 2);

      var hook = func => {  // Hooks/unhooks events to the whole browser window.
        func('mousemove', processMousemove);
        func('mouseup',   processMouseup),
        func('blur',      stopDrag);
      };


      // Function for setting/restoring the cursor to 'grabbing' on the whole
      // page. Because the mouse may leave the Term and hover other elements.
      var origCursor = document.body.style.cursor;
      var setGrabCursor = (on = true) => {
        document.body.style.cursor = on ? 'grabbing' : origCursor;
      };


      var processMousemove = event => {
        var loc = mouseCoosRelToTerm(event);

        // If not yet dragging (because mousemove-distance threshold not yet
        // reached), then check if the mouse is past the threshold now.
        // If not, abort; if so, start dragging and make the first move-response.
        if (this.dragIndex < 0) {
          var dx = loc.x - dragOffset.x;
          var dy = loc.y - dragOffset.y;
          if (dx * dx + dy * dy < threshSqr)  return;  // Abort if < threshold.

          this.dragIndex = index;
          this.$set(term, 'drag', { x: term.x,  y: term.y });
          this.inputElement().blur();  // Makes any autocomplete-list close.
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
          this.moveTerm(from, to);
          this.dragIndex = index = to;  // Updates local-var. `index` too!
          this.inputIndex = this.terms.findIndex(term => term.key == inputKey);
        }
      };


      var processMouseup = event => {
        processMousemove(event);
        stopDrag();
      };

      var stopDrag = () => {
        hook(window.removeEventListener);
        if (this.dragIndex >= 0)  {
          this.dragIndex = -1;
          this.$delete(term, 'drag');
          setGrabCursor(false);

          // These hacky 2 lines prevent showing ThePopup after drag&dropping a
          // Term.  Because: if the Term gets placed at a location (only) where
          // the mouse is still hovering it, it soon reports a new `mouseenter`.
          this.enablePopup = false;
          setTimeout(() => this.enablePopup = true,  100);
        }
      };


      hook(window.addEventListener);
    },



    //
    // --- SHOWING/HIDING THEPOPUP ---------------------------------------------
    //

    clearPopupTimers() {
      clearTimeout(this.timerPopupHide);
      clearTimeout(this.timerPopupShow);
    },


    showPopup(index) {  // Shows ThePopup for Term at `index`, unless it is < 0.
      this.clearPopupTimers();
      this.popupLoc = index;
    },


    hidePopup() {
      this.clearPopupTimers();
      this.showPopup(-1);
    },


    showPopupDelayed(index) {
      this.clearPopupTimers();
      if (
        (!to.isEditable(this.terms[index]) || this.popupLoc >= 0)  &&
        this.dragIndex < 0  &&  this.enablePopup
      ) {
        this.timerPopupShow = setTimeout(
          () => this.showPopup(index), this.popupLoc < 0 ?
            this.sizes.delayPopupShow : this.sizes.delayPopupSwitch);
      }
    },


    hidePopupDelayed() {
      this.clearPopupTimers();
      this.timerPopupHide = setTimeout(
        () => this.hidePopup(), this.sizes.delayPopupHide);
    },


    /**
     * Mouseenter over ThePopup: only cancels the recent Mouseleave from a Term.
     */
    onMouseenter_popup()  { clearTimeout(this.timerPopupHide) },
    onMouseenter(index)   { this.showPopupDelayed(index) },
    onMouseleave()        { this.hidePopupDelayed() },

    onClick(index)    { this.showPopupDelayed(index) },  // Called for Touch too.
    onListOpen(index) { this.hidePopup()}, // eslint-disable-line no-unused-vars



    //
    // --- RESPONSE TO SOME THEPOPUP MENU-ITEMS --------------------------------
    //

    onInsertBefore(index) {
      this.hidePopup();
      this.insertEmptyTerm(index, 0);
    },


    onSetType(index, type) {
      this.hidePopup();

      var term = this.terms[index];
      to.setType(term, type, this);

      // Only refocus after changing an Edit-Term.  Do not move focus after
      // changing a non-Edit-Term from ThePopup menu, because it feels like a
      // more indirect interaction than a Ctrl+Click-to-change on the Term.
      if (to.isEditable(term))  this.moveInputTo(index);

      if (!term.isEndTerm)  this.emitValue();
    },


    onCopy(index, asRef = false) {  // (Will only be called if termCopy exists).
      this.hidePopup();
      this.$nextTick(() => // Let Vue update before calling an external function.
        this.termCopy(to.prepForCopy(this.terms[index], asRef))
      );
    },


    onCopyRef(index) {  // Note: ThePopup ensures that this function is only..
      this.onCopy(index, true);     // ..called on Terms with not-null instID.
    },


    onPaste(index) {
      this.hidePopup();
      this.$nextTick(() =>    // Let Vue update before calling an external func.
        this.insertTerm(index,
          to.prepForPaste(this.terms[index], this.termPaste()))
      );
    }
  }
};
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
  .term:not(.edit),
  .terms >>> .popup .menu {
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

  .inp >>> .list {
    margin-top: 3.5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.23);
  }

  .inp >>> .item.item-type-literal .hotkey {
    float: right;
    font-weight: normal;
    color: #e0e0e0;
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

  .term >>> .label {
    white-space: pre;
  }

  .term.drag {
    z-index: 3;
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
    height: 1px;
    overflow: visible;
    pointer-events: none;
    content: " ";
    border-top: 1.5px dotted #aaa;
  }

  /* * */

</style>
