/**
 * This module provides functionality that manages mainly the _data_ aspect
 * of Terms, such as its three identifiers and its state in the VSM-sentence.
 * Its coordinates for display in the UI are managed by TheTerms.
 * Functionality here includes: adding or removing properties in a received
 * VSM-term data-Object to make it ready for use in TheTerms; and making an
 * internally used Object ready for output; and functionality to convert between
 * Term types; etc.
 */

import sanitizeHtml from './sanitizeHtml.js';


/**
 * This helps with adding a unique `:key` to each Term, which is required
 * for `v-for`.  Note that key can not be a Term's `index`(=position), as it
 * can change, not the `term.id + term.str`, as this may not be unique.
 */
var lastKey = -1;



var to = {  // Here starts the exported Object.

  /**
   * Creates a new EndTerm data-object: an Edit-Instance-type Term.
   */
  newEndTerm() {
    return to.newEditTerm(true);
  },


  /**
   * Creates a new, default Edit-type Term data-object.
   * + (In addition, it ensures that certain properties are set on the newly
   *   created Object. This makes these properties reactive, so that TheTerms's
   *   `setTermCoordinates()` doesn't need to use `vm.$set()` for every update).
   */
  newEditTerm(isEndTerm = false) {
    return {
      str: '', label: '',              // }
      x: 0, y: 0, width: 0, height: 0, // } Makes these reactive in the UI.
      type: 'EI',
      key: ++lastKey,
      ...isEndTerm && { isEndTerm }
    };
  },


  /**
   * Deep-clones the given Object, e.g. a Term data-object.
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },


  /**
   * Returns a prepped *clone* of a Term that was received (either by TheTerm's
   * `origTerms` prop, or through a Paste request), to make it ready for
   * internal use. It:
   * - adds a `key` property;
   * - adds an inferred `type` property (based on which ID-properties it has);
   * - applies `pruneProperties()`.
   */
  prepToReceive(term_0, addKey = true) {
    var term = to.clone(term_0);
    to.inferType(term);
    if (addKey)  term.key = ++lastKey;
    to.pruneProperties(term);
    return term;
  },


  /**
   * Returns a prepped *clone* of a Term that was received through a Paste
   * request. It:
   * - calls `prepToReceive()` on it;
   * - deletes properties that are used internally in VsmBox;
   * - removes template- and sentence-related properties that must be kept in
   *   the Edit-Term into which it is being pasted;
   * - (keeps any other properties).
   */
  prepToReceiveForPaste(term_0) {
    var term = to.prepToReceive(term_0, false); // (false=>no new `key`).
    to.deleteInternallyUsedProperties(term);
    delete term.isFocal;
    delete term.minWidth;
    delete term.maxWidth;
    delete term.editWidth;
    delete term.queryOptions;
    delete term.placeholder;
    return term;
  },


  /**
   * Modifies the given Term (which is an Object in standard form like VsmBox
   * accepts it), by inferring and setting its `type` property.
   */
  inferType(term) {                              /* eslint-disable indent */
    term.type =
      term.str      === undefined ?  // Edit-Term; subtypes: Ref/Inst/Class/Lit.
        (['ER', 'EC', 'EL'].includes(term.type) ? term.type : 'EI') :
      term.classID  === undefined ? 'L' :  // Literal: data term.
      term.instID   === undefined ? 'C' :  // Class: general Term.
      term.parentID === undefined ? 'I' :  // Instance: specific Term.
      'R';                                 // Referring (=further-specif.) term.
  },                                                  /* eslint-enable indent */


  /**
   * This *modifies* a given Term. It:
   * - deletes any IDs that it should not have for its `type`; (note that e.g.
   *     a Literal-Term will have a classID if it was changed from Class to Lit
   *     by the user. The ID is kept in case the user wants to change it back;
   *     note also that such IDs are removed from emitted data);
   * - enforces that an R-type Term has either both not-null or both null
   *   `classID` and `parentID`;
   * - deletes the `dictID`/`descr` property if it is empty, or if the Term
   *   should not have it for its type;
   * - deletes the `style` property if it is empty, or part of an Edit-type Term;
   * - deletes any properties that are used internally by TheTerms; (this can
   *   both prevent received data from interfering with TheTerms' workings,
   *   and prevent emitted data from containing such properties).
   * This function is used both on received and emitted data. It sets and
   * deletes properties non-reactively.
   */
  pruneProperties(term) {
    var t = term.type;
    if (t == 'R') {
      if (!term.classID || !term.parentID)  term.classID = term.parentID = null;
    }
    else {  // Here, `t` is one of: I, C, L, ER, EI, EC, EL.
      delete term.parentID;
      if (t != 'I') {
        delete term.instID;
        if (t != 'C')  delete term.classID;
      }
    }

    var notRIC = !['R', 'I', 'C'].includes(t);  // This also excludes Edit-Terms.
    if (notRIC || !term.dictID)  delete term.dictID;
    if (notRIC || !term.descr )  delete term.descr;

    if (!term.style || to.isEditable(term))  delete term.style;

    delete term.label;
    delete term.backup;
    delete term.drag;
  },


  /**
   * Tells if the given Term is an Editable-type Term, based on its `type`
   * property being one of: ER, EI, EC, EL.
   */
  isEditable(term) {
    return term.type[0] == 'E';
  },


  /**
   * Modifies the given Term: changes its type to the next one in the cycle:
   * I->C->L->R->I, and EI->EC->EL->ER->EI; or R->L->R, if invalid classID.
   */
  cycleType(term, allowClassNull, vm) {
    var e = to.isEditable(term) ? 'E': '';
    var arr = (
      (e || term.classID || allowClassNull) ?
        ['I', 'C', 'L', 'R', 'I'] : ['L', 'R', 'L']  ).map(x => e + x);
    term.type = arr[arr.indexOf(term.type) + 1];

    to.ensureIDs(term, vm);
  },


  /**
   * Modifies the given Term by giving it a new type. Its IDs are updated
   * as needed.
   * + Must *not* be used for changing between Edit- & not-Edit-type.
   * + Does *not* consider `allowClassNull`, so the caller must do so.
   */
  setType(term, type, vm) {
    term.type = type;
    to.ensureIDs(term, vm);
  },


  /**
   * Modifies a given *non-Edit*-type Term, so it has all required `..ID`
   * properties, based on its `type` property only.
   * + Unlike `inferType()`, which is called to infer `type` from `..ID`s
   *   etc. (e.g. called at initialization), here `ensureIDs()` is called
   *   to ensure that all `..ID`s for `type` exist (e.g. called after changing
   *   Term type, or after filling in an Edit-Term).
   * + For simplicity with reactivity-handling, this function just ensures that
   *   all 3 IDs exist, whenever we start modifying the set of IDs for a Term.
   *   Note hereby that IDs are never deleted anyway, as they must be kept as a
   *   backup for when the user changes the Term's type several times. But any
   *   unneeded IDs are stripped before emitting data anyway.
   * + (Note: this function does not make classID null if parentID is null
   *    (which happens before emit), again for backup reasons).
   * This function is made to be called on reactivity-enabled data. It sets
   * and deletes properties in a reactivity-supporting way.
   */
  ensureIDs(term, vm = false) {
    ['classID', 'instID', 'parentID'].forEach(k => {
      if (term[k] === undefined) {
        if (vm)  vm.$set(term, k, null);  // Use Vue's `$set`, only if given.
        else     term[k] = null;
      }
    });
  },


  /**
   * Modifies a given Term, to set or unset it as focal.
   * Note that the calling function must ensure that only one Term in a
   * VSM-sentence at a time is focal.
   */
  makeFocal(term, bool, vm) {
    if (bool)  vm.$set   (term, 'isFocal', true);
    else       vm.$delete(term, 'isFocal');
  },


  /**
   * Returns a prepped *clone* of a Term data-Object as it is used internally,
   * to make it ready for output. It excludes any properties that:
   * - are internal state properties that should not be publicly visible, or
   * - are unused: see `pruneProperties()`.
   */
  prepToEmit(term_0) {
    var term = to.clone(term_0);
    var e    = to.isEditable(term);
    to.pruneProperties(term);
    if (e)  delete term.str;
    if (!e || term.type == 'EI')  delete term.type;
    to.deleteInternallyUsedProperties(term);
    return term;
  },


  /**
   * Modifies a given Term, so it no longer has any properties that are
   * used internally by VsmBox.
   */
  deleteInternallyUsedProperties(term) {
    delete term.label;
    delete term.key;
    delete term.x;  delete term.width;
    delete term.y;  delete term.height;
    delete term.isEndTerm;
    delete term.drag;  delete term.backup;
  },


  /**
   * Returns a new Edit-Term object, based on a clone of given *non-Edit-Term*.
   * Hereby it:
   * - copies the given Term's `type/str/style/label` into a `backup` property
   *   that is set on the new Term, so that the original Term can be restored
   *   if the user would choose to;
   * - leaves and does not backup the `...ID` properties, because these will
   *   stay untouched as long as the new Term stays an Edit-Term, or overwritten
   *   if the user would Enter data in it.
   */
  createEditTerm(term) {
    var str = sanitizeHtml(term.str);
    var term2 = Object.assign(to.clone(term), {
      type: 'E' + term.type,
      label: str,  // Remove customization & styling, but keep protection.
      backup: {
        type: term.type,
        str: term.str,
        ...term.style && { style: term.style },       // `style` is optional, ..
        label: term.label                      // ..but each Term has a `label`.
      }
    });
    delete term2.style;  // An Edit-Term never has a `style` property.
    return term2;
  },


  /**
   * Returns a new, non-Edit-Term object, based on a clone of given *Edit-Term*
   * which must have a `backup` property. It restores backed up properties.
   */
  createRestoredTerm(term) {
    var term2 = Object.assign(to.clone(term), term.backup);
    delete term2.backup;
    return term2;
  },


  /**
   * Modifies the given Term to make it not marked as endTerm.
   */
  unsetAsEndTerm(term, vm) {
    vm.$delete(term, 'isEndTerm');
  },


  /**
   * Returns a new, R- or L-Term data-object, based on the given *ER/EL-Term*,
   * by 'filling in' only the input-string from the Edit-Term.
   */
  createRorLTerm(term) {
    term = Object.assign(to.clone(term), { type: term.type.replace('E', '') });
    to.ensureIDs(term);  // If R-Term: add or preserve all required IDs.
    return term;
  },


  /**
   * Returns a new Term data-object, based on the given *Edit-Term*, and the
   * given match-object (or similar Object, as defined in 'vsm-dictionary''s
   * spec, and extended in 'vsm-box''s `advanced-search` spec).
   * It merges the match into a clone of Edit-Term, so it add/overwrite/deletes
   * certain properties, which makes it keep properties like `minWidth` etc.
   * Note: for Term-type determination, see the spec.
   * Note: it does *not* keep extra properties from a match-obj; which contrasts
   *   with `prepToReceive()`. Extra properties (maybe useful for tracking) are
   *   only kept when given in `origTerms`/Paste, not when entering new Terms).
   */
  createTermFromMatch(term, match) {
    term = Object.assign(to.clone(term), {
      type: match.termType ||
        (match.id === '' ? 'R' : term.type == 'EC' ? 'C' : 'I'),
      str: match.str,
      classID:  match.id || null,
      instID:   null,
      parentID: match.parentID || null,
      style:  match.style || '',
      dictID: match.dictID,
      descr:  match.descr
    });

    // Remove `descr` from a VsmAC refTerm. (Check `type`, not `termType`).
    if (match.type == 'R' || match.type == 'N')  term.descr = '';

    to.pruneProperties(term);
    return term;
  },


  /**
   * Returns a clone a given Term, keeping only its 'core' properties. This
   * means that it excludes:
   * - properties that pertain to its role in the VSM-sentence (`isFocal`),
   * - its edit/input-configuration (`min-/max-/editWidth/queryOptions`), and
   * - any extra properties set on the Term.
   * This function keeps `type`, also for R/I/C/L- and EI-Terms.
   */
  keepCoreProps(term) {
    return ['str', 'style', 'type', 'dictID', 'descr',
      'classID', 'instID', 'parentID'].reduce(
      (o, k) => { if (term[k] !== undefined) o[k] = term[k];  return o }, {});
  },


  /**
   * Returns a *clone* of a Term, in a form that can be sent to `termCopy`. It:
   * - keeps only 'core' properties of the Term, and `type` only if appropriate,
   * - makes instID null (only relevant for R/I-type Terms), and
   * - if `asRef` then makes the copy a child-term of the given Term, but
   *   only if it is an *R- or I-Term*.
   */
  prepForCopy(term_0, asRef) {
    var term = to.keepCoreProps(to.prepToEmit(term_0));
    if (term.instID !== undefined) {
      if (asRef)  term.parentID = term.instID;
      term.instID = null;
    }
    return term;
  },


  /**
   * Returns a *clone* of the given Term, in which the (cloned) properties of
   * the second given Term (=received data from `termPaste`) are merged.
   * + Does not copy template- or VSM-sentence-related properties. These are
   *   kept as they are in the first term.
   * + Any extra properties are copied (as long as they are non-conflicting
   *   for the internal workings of VsmBox). This may be useful for tracking
   *   what was pasted where in a VSM-template.
   */
  prepForPaste(term, term2) {
    var t = to.clone(term);
    delete t.style;  // Can be overwritten by `term2`.
    delete t.label;  // Should be set by TheTerms only.
    return Object.assign(t,
      to.prepToReceiveForPaste(term2),
      { instID: null }  // Required for R/I-Terms; no problem for C/L-Terms.
    );
  }
};

export default to;
