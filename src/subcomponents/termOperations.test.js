/**
 * + 'termOperations.test.js' tests data-operations on Term data-objects.
 * + (Meanwhile, 'TheTerms.test.js' reflects/mirrors some of the tests here,
 *    but that file tests the effects on the User Interface).
 */
import to from './termOperations.js';


describe('sub/termOperations', () => {

  // This generates a Term object as it may occur internally in TheTerms.
  const _term = extra => ({ // Define via function, so each test gets new Object.
    type: 'I',
    str: 'ab',  style: 'i',  label: '<i>ab</i>',
    classID: 'A:01',  instID: 'id5',
    queryOptions: { z: [] },
    minWidth: 10,  maxWidth: 20,  editWidth: 30,
    x: 1,  y: 1,  width: 8, height: 4,
    isFocal: true,  isEndTerm: true,
    key: 'xx',
    aa: { bb: 1 }, // Helps test that extra properties are kept, and deep-cloned.
    ...extra
  });


  // These generate minimal Term objects as they may be received by TheTerms,
  // e.g. via VsmBox's `initialValue`.
  // The first argument enables to add extra (or override existing) properties.
  const _termR  = extra => ({ str: 'a', classID: 'A:01', instID: 'id5',
    parentID: 'id3', ...extra });
  const _termI  = extra => ({ str: 'a', classID: 'A:01', instID:'id5',...extra});
  const _termC  = extra => ({ str: 'a', classID: 'A:01', ...extra });
  const _termL  = extra => ({ str: 'a',   ...extra });
  const _termER = extra => ({ type: 'ER', ...extra });
  const _termEI = extra => ({             ...extra });
  const _termEC = extra => ({ type: 'EC', ...extra });
  const _termEL = extra => ({ type: 'EL', ...extra });

  // These also set the `type`, as if applying `inferType()` to the above.
  const _termTR  = extra => ({ type: 'R' , ..._termR (extra)});
  const _termTI  = extra => ({ type: 'I' , ..._termI (extra)});
  const _termTC  = extra => ({ type: 'C' , ..._termC (extra)});
  const _termTL  = extra => ({ type: 'L' , ..._termL (extra)});
  const _termTER = extra => ({ type: 'ER', ..._termER(extra)});
  const _termTEI = extra => ({ type: 'EI', ..._termEI(extra)});
  const _termTEC = extra => ({ type: 'EC', ..._termEC(extra)});
  const _termTEL = extra => ({ type: 'EL', ..._termEL(extra)});


  const _vm = {
    $set   (obj, prop, val)  { obj[prop] = val  },
    $delete(obj, prop     )  { delete obj[prop] }
  };


  it('newEndTerm()', () => {
    var t1 = to.newEndTerm();
    var t2 = to.newEndTerm();
    t1.key      .should.not.equal(t2.key);
    t1.label    .should.equal('');
    t1.type     .should.equal('EI');
    t1.isEndTerm.should.equal(true);
  });


  it('newEditTerm()', () => {
    var t1 = to.newEditTerm();
    var t2 = to.newEditTerm(true);
    t1.key      .should.not.equal(t2.key);
    t1.str      .should.equal('');
    t1.label    .should.equal('');
    t1.type     .should.equal('EI');
    expect(t1.isEndTerm).to.equal(undefined);
    t2.isEndTerm.should.equal(true);
  });


  it('clone()', () => {
    var t1 = _term();
    var t2 = to.clone(t1);
    t2.should.deep.equal(t1);
    t1.aa.bb = 2;
    t2.aa.bb.should.equal(1);  // Unaffected by change in `t1`.
  });


  it('prepToReceive()', () => {
    // It clones received data.
    var t1 = _term();
    var t2 = to.prepToReceive(_term());
    t1.aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // It infers `type` correctly. [More is tested at `inferType()`].
    to.prepToReceive(_termR()).type.should.equal('R');
    to.prepToReceive({ type: 'EL' }).type.should.equal('EL');

    // It gives consecutive `key`s to received Term objects.
    t1 = to.prepToReceive(_term());
    t2 = to.prepToReceive(_term());
    t2.key.should.equal(t1.key + 1);

    // Does not add or change `key` if asked not to.
    t1 = to.prepToReceive(_term(), false);
    expect(to.prepToReceive(_termR(), false).key).to.equal(undefined);
    expect(to.prepToReceive(_term (), false).key).to.equal('xx');  // Kept orig.

    // It adjusts some received prop.s. [More is tested at `pruneProperties()`].
    expect(to.prepToReceive(_termR({ classID : null })) .parentID)
      .to.equal(null);
    expect(to.prepToReceive(_termI({ dictID: '', descr: '' })) .dictID)
      .to.equal(undefined);
    expect(to.prepToReceive(_termI({ type: 'XX' })) .type).to.equal('I');
  });


  it('inferType()', () => {
    // Make a version of `to.inferType` that `return`s the given & updated Term.
    const inferType = term => { to.inferType(term);  return term };

    inferType(_termR()).type.should.equal('R');
    inferType(_termI()).type.should.equal('I');
    inferType(_termC()).type.should.equal('C');
    inferType(_termL()).type.should.equal('L');
    inferType({ type: 'ER' }).type.should.equal('ER');
    inferType({            }).type.should.equal('EI');
    inferType({ type: 'EC' }).type.should.equal('EC');
    inferType({ type: 'EL' }).type.should.equal('EL');
  });


  it('pruneProperties()', () => {
    const pruneProperties = term => { to.pruneProperties(term);  return term };

    // For R-Term: if either classID or parentID is null, it makes both null.
    expect(pruneProperties(_termTR({ classID : null })).parentID).to.equal(null);
    expect(pruneProperties(_termTR({ parentID: null })).classID ).to.equal(null);
    var t = pruneProperties(_termTR({}));
    [t.classID, t.parentID].should.deep.equal(['A:01', 'id3']);

    // Removes `dictID` and `descr` from L- and Edit-Terms, or if empty.
    [_termTL, _termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX => {
      t = pruneProperties(_termTX({ dictID: 'X', descr: 'xyz' }));
      [t.dictID, t.descr].should.deep.equal([undefined, undefined]);
    });
    [_termTR, _termTI, _termTC].forEach(_termTX => { // Keeps it in R/I/C-Terms.
      t = pruneProperties(_termTX({ dictID: 'X', descr: 'xyz' }));
      [t.dictID, t.descr].should.deep.equal(['X', 'xyz']);
    });
    t = pruneProperties(_termTI({ dictID: '', descr: '' }));
    [t.dictID, t.descr].should.deep.equal([undefined, undefined]);

    // Removes `style` from Edit-Terms, or if empty.
    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX => {
      t = pruneProperties(_termTX({ style: 'i' }));
      expect(t.style).to.equal(undefined);
    });
    [_termTR, _termTI, _termTC, _termTL].forEach(_termTX => {
      t = pruneProperties(_termTX({ style: 'i' }));
      t.style.should.equal('i');
    });
    t = pruneProperties(_termTI({ style: '' }));
    expect(t.style).to.equal(undefined);

    // Keeps extra properties only if they don't interfere with internal working.
    t = pruneProperties(_termTI({ backup: 'XYZ', label: '<i>a</i>', aa: 'OK' }));
    expect(t.backup).to.equal(undefined);  // Removed, as it would interfere.
    expect(t.label ).to.equal(undefined);  // Removed, as TheTerms makes this.
    expect(t.aa    ).to.equal('OK');       // Kept, no problem.
  });


  it('isEditable()', () => {
    [_termTR,  _termTI,  _termTC,  _termTL].forEach(_termTX =>
      to.isEditable(_termTX()).should.equal(false));
    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX =>
      to.isEditable(_termTX()).should.equal(true ));
  });


  it('cycleType()', () => {
    const cycleType = (term, allowClassNull = true) => {
      to.cycleType(term, allowClassNull, _vm);  return term; };

    // Changes type cyclically.
    [true, false].forEach(bool => {
      cycleType(_termTR (), bool) .type.should.equal('I');
      cycleType(_termTI (), bool) .type.should.equal('C');
      cycleType(_termTC (), bool) .type.should.equal('L');
      cycleType(_termTL (), bool) .type.should.equal('R');
      cycleType(_termTER(), bool) .type.should.equal('EI');
      cycleType(_termTEI(), bool) .type.should.equal('EC');
      cycleType(_termTEC(), bool) .type.should.equal('EL');
      cycleType(_termTEL(), bool) .type.should.equal('ER');
    });

    // Skips types I and C, only if their classID==null, while !allowClassNull.
    cycleType(_termTR ({ classID: null }), true ) .type.should.equal('I');
    cycleType(_termTI ({ classID: null }), true ) .type.should.equal('C');
    cycleType(_termTC ({ classID: null }), true ) .type.should.equal('L');
    cycleType(_termTL ({ classID: null }), true ) .type.should.equal('R');
    cycleType(_termTR ({ classID: null }), false) .type.should.equal('L');
    cycleType(_termTI ({ classID: null }), false) .type.should.equal('L');
    cycleType(_termTC ({ classID: null }), false) .type.should.equal('L');
    cycleType(_termTL ({ classID: null }), false) .type.should.equal('R');

    // Adds missing IDs needed by new type.  [More is tested at `ensureIDs()`].
    var t = cycleType(_termTL());
    [t.classID, t.instID, t.parentID].should.deep.equal([null, null, null]);

    // Keeps IDs that it does not need anymore, so they can be reactivated.
    t = cycleType(cycleType(cycleType(cycleType(_termTR()))));
    t.type.should.equal('R');
    [t.classID, t.instID, t.parentID].should.deep.equal(['A:01', 'id5', 'id3']);
  });


  it('setType()', () => {
    const setType = (term, type) => {
      to.setType(term, type, _vm);  return term; };

    // Sets the new type.
    [_termTR, _termTI, _termTC, _termTL].forEach(_termTX =>
      [ 'R', 'I', 'C', 'L' ].forEach(type =>
        setType(_termTX(), type) .type.should.equal(type) ));

    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX =>
      [ 'ER', 'EI', 'EC', 'EL' ].forEach(type =>
        setType(_termTX(), type) .type.should.equal(type) ));

    // Adds missing IDs needed by new type.  [More is tested at `ensureIDs()`].
    var t = setType(_termTL(), 'R');
    [t.classID, t.instID, t.parentID].should.deep.equal([null, null, null]);
    t     = setType(_termTL(), 'I');
    [t.classID, t.instID            ].should.deep.equal([null, null]);
    t     = setType(_termTL(), 'C');
    [t.classID                      ].should.deep.equal([null]);

    // Keeps IDs that it does not need anymore, so they can be reactivated.
    t = setType( setType(_termTR(), 'L'), 'R');
    [t.classID, t.instID, t.parentID].should.deep.equal(['A:01', 'id5', 'id3']);
  });


  it('ensureIDs()', () => {
    function testCase(vm) {
      const ensureIDs = term => { to.ensureIDs(term, vm);  return term };

      // Adds necessary IDs as `null`.
      var t = ensureIDs({ type: 'R' });
      [t.classID, t.instID, t.parentID].should.deep.equal([null, null, null]);
      t     = ensureIDs({ type: 'I' });
      [t.classID, t.instID            ].should.deep.equal([null, null]);
      t     = ensureIDs({ type: 'C' });
      [t.classID                      ].should.deep.equal([null]);

      // Does not overwrite existing IDs (i.e.: keeps them as a backup).
      t = ensureIDs(_termR({ type: 'I' }));
      t.type.should.equal('I');
      [                     t.parentID].should.deep.equal([             'id3']);

      t = ensureIDs(_termR({ type: 'C' }));
      t.type.should.equal('C');
      [           t.instID, t.parentID].should.deep.equal([       'id5','id3']);

      t = ensureIDs(_termR({ type: 'L' }));
      t.type.should.equal('L');
      [t.classID, t.instID, t.parentID].should.deep.equal(['A:01','id5','id3']);
    }

    // Test this function fully, both with & without the optional `vm` argument.
    testCase(_vm);
    testCase();
  });


  it('makeFocal()', () => {
    const makeFocal = (term, b) => { to.makeFocal(term, b, _vm);  return term };

    var t = _termTI();
    [true, true, false, false, true].forEach(bool => { // Some consecutive calls.
      t = makeFocal(t, bool);
      expect(t.isFocal).to.equal(bool ? true : undefined);
    });
  });


  it('prepToEmit()', () => {
    // It clones.
    var t  = _term();
    var t2 = to.prepToEmit(t);
    t .aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // Removes internally used Term properties.
    t = _term({ backup: { a: 1 }, drag: { x: 0, y: 0 } });
    to.prepToEmit(t).should.deep.equal({
      // No more label, x, y, width, height, key, backup, drag, isEndTerm.
      str: 'ab',  style: 'i',  classID: 'A:01',  instID: 'id5',
      queryOptions: { z: [] }, minWidth: 10,  maxWidth: 20,  editWidth: 30,
      isFocal: true,
      aa: { bb: 1 }  // It keeps other properties though.
    });

    // It makes both classID and parentID null if one of them is null.
    expect(to.prepToEmit(_termTR({ classID : null })).parentID).to.equal(null);
    expect(to.prepToEmit(_termTR({ parentID: null })).classID ).to.equal(null);
    t = to.prepToEmit(_termTR({}));
    [t.classID, t.parentID].should.deep.equal(['A:01', 'id3']);

    // It removes unused IDs.  [More is tested at `pruneProperties()`].
    t = to.prepToEmit(_termTR({ type: 'C' }));  // C-term with IDS as if R-Term.
    [t.instID, t.parentID].should.deep.equal([undefined, undefined]);

    // Removes `str` for Edit-Terms.
    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX =>
      expect( to.prepToEmit(_termTX({ str: 'ab' })).str ).to.equal(undefined));

    // Removes `style` if empty.
    expect( to.prepToEmit(_termTI({ style: '' })).style ).to.equal(undefined);

    // Removes types other than ER/EC/EL.
    [_termTR, _termTI, _termTC, _termTL, _termTEI].forEach(_termTX =>
      expect( to.prepToEmit(_termTX()).type ).to.equal(undefined));
    to.prepToEmit(_termTER()).type.should.equal('ER');
    to.prepToEmit(_termTEC()).type.should.equal('EC');
    to.prepToEmit(_termTEL()).type.should.equal('EL');
  });


  it('createEditTerm()', () => {
    // It clones.
    var t  = _term();
    var t2 = to.createEditTerm(t);
    t .aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // Changes to corresponding Edit-type.
    to.createEditTerm(_termTR()).type.should.equal('ER');
    to.createEditTerm(_termTI()).type.should.equal('EI');
    to.createEditTerm(_termTC()).type.should.equal('EC');
    to.createEditTerm(_termTL()).type.should.equal('EL');

    // Deletes `style`, removes styling from `label`, adds `backup` property.
    // Keeps all other properties.
    t  = to.createEditTerm(_term());
    t2 = _term();  delete t2.style; // Start creating target Obj. for comparison.
    t.should.deep.equal(Object.assign( t2, {
      type: 'EI',
      label: 'ab',
      backup: { type: 'I',  str: 'ab',  style: 'i',  label: '<i>ab</i>' }
    } ));

    // Adds `backup` property without style if there was none in original Term.
    to.createEditTerm(_termTC({ label: 'a' })).backup
      .should.deep.equal({ type: 'C',  str: 'a',  label: 'a' });

    // Removes styling from label, but keeps it sanitized.
    t = to.createEditTerm(_term({
      str: 'aa <script ',  style: 'i',  label: '<i>aa &lt;script </i>' }));
    t.str  .should.equal('aa <script ');  // `str` isn't changed nor shown in UI.
    t.label.should.equal('aa &lt;script ');  // Not styled, but protected.
  });


  it('createRestoredTerm()', () => {
    // It clones.
    var t  = _term();
    var t2 = to.createRestoredTerm(t);
    t .aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // It removes the `backup` property, after merging it into the main data.
    t = to.createRestoredTerm( {
      type: 'EI',
      str: 'abcd',  label: 'abcd',  classID: 'A:01',  instID: 'id5',
      backup: { type: 'I', str: 'ab',  style: 'i',  label: '<i>ab</i>' } } );
    expect(t.backup).to.equal(undefined);
    [t.type, t.str, t.style, t.label] .should.deep.equal(
      ['I', 'ab', 'i', '<i>ab</i>']);
  });


  it('unsetAsEndTerm()', () => {
    const unsetAsEndTerm = term => { to.unsetAsEndTerm(term, _vm);  return term};

    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX =>
      expect( unsetAsEndTerm( _termTX({ isEndTerm: true }) ) .isEndTerm)
        .to.equal(undefined) );
  });


  it('createRorLTerm()', () => {
    // It works on a clone of the given Term.
    var t  = _termTER({ aa: { bb: 1 } });
    var t2 = to.createRorLTerm(t);
    t .aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // Changes Term to its corresponding non-Edit-type.
    to.createRorLTerm(_termTER()).type.should.equal('R');
    to.createRorLTerm(_termTEL()).type.should.equal('L');

    // Adds IDS needed for R-Term.
    t = to.createRorLTerm(_termTER());
    [t.classID, t.instID, t.parentID].should.deep.equal([null, null, null]);

    // It keeps any extra IDs on an L-Term (as a backup, so the user can still
    // change Term-type back to R/I/C after changing only `str`).
    t = to.createRorLTerm(
      _termTEL({ classID: 'A:01', instID: 'id5', parentID: null }));
    [t.classID, t.instID, t.parentID].should.deep.equal(['A:01', 'id5', null]);
  });


  it('createTermFromMatch()', () => {
    // It works on a clone of the given Term.
    var t  = _termTER({ aa: { bb: 1 } });
    var t2 = to.createTermFromMatch(t, {});
    t .aa.bb = 2;
    t2.aa.bb.should.equal(1);

    // It copies `str/style/dictID/descr` into the new Term, deletes `label`,
    // sets `classID` to the given `id`, fills in `instID` as null (for I-Term),
    // and keeps all settings/UI/extra properties of the original Term.
    t = to.createTermFromMatch(
      _term({ type: 'EI' }),
      { str: 's', style: 'b', id: 'M:99', dictID: 'A', descr: 'D' } // Match-obj.
    );
    t.should.deep.equal({
      type: 'I',
      str: 's',  style: 'b',  dictID: 'A', descr: 'D',  // Note: deletes `label`.
      classID: 'M:99',  instID: null,
      queryOptions: { z: [] },           // It keeps all properties from here on.
      minWidth: 10,  maxWidth: 20,  editWidth: 30,
      x: 1,  y: 1,  width: 8, height: 4,
      isFocal: true,  isEndTerm: true,  key: 'xx',  aa: { bb: 1 }
    });

    // Deletes `dictID/descr/style` if the match-object does not have them.
    t = to.createTermFromMatch(
      _term({ type: 'EI', style: 'i', dictID: 'AA', descr: 'DD' }),
      { str: 's', id: 'M:99' }
    );
    [t.dictID, t.descr].should.deep.equal([undefined, undefined]);

    // Removes `descr` if match-object's `type` (not `termType`) is 'R' or 'N'.
    var m = matchType => ({ str: 's', id: 'x', descr: 'DD', type: matchType });
    expect(to.createTermFromMatch(_termTEI(), m('R')).descr).to.equal(undefined);
    expect(to.createTermFromMatch(_termTEI(), m('N')).descr).to.equal(undefined);
    expect(to.createTermFromMatch(_termTEI(), m('S')).descr).to.equal('DD');

    // The match's `termType` determines new Term's type, no matter the Edit-..
    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX => // ..Term's type.
      ['R', 'I', 'C', 'L'].forEach(termType =>
        to.createTermFromMatch(_termTX(), { str: 's', termType })
          .type.should.equal(termType) ));

    // If `termType` is not given, and `id==null`, it creates an R-Term.
    [_termTER, _termTEI, _termTEC, _termTEL].forEach(_termTX =>
      to.createTermFromMatch(_termTX(), { str: 's', id: '' })
        .type.should.equal('R'));

    // If `termType` is not given, and `id!=null`, the Edit-term's type
    // determines the new Term's type: ER/EI/EL->I, and EC->C.
    var match = { str: 's', id: 'id5' };
    to.createTermFromMatch(_termTER(), match).type.should.equal('I');
    to.createTermFromMatch(_termTEI(), match).type.should.equal('I');
    to.createTermFromMatch(_termTEC(), match).type.should.equal('C');
    to.createTermFromMatch(_termTEL(), match).type.should.equal('I');

    // Adds IDs when needed.
    to.createTermFromMatch(_termTEL(), { str: 's', termType: 'R' }) .should.deep
      .equal({ type: 'R', str: 's', classID: null, instID: null, parentID:null});

    // Removes IDs when needed.
    to.createTermFromMatch(_termTR({ type: 'ER' }), { str: 's', termType: 'L' })
      .should.deep.equal({ type: 'L', str: 's' });

    // Enforces that `instID==null` for R/I-Terms: it ignores a backup-instID in
    // the Edit-Term, and one given in the match-object.
    ['R', 'I'].forEach(termType => {
      t = to.createTermFromMatch( _termTEI({ instID: 'id3' }),
        { str: 's', termType, instID: 'id33' } );
      expect(t.instID).to.equal(null);
    });

    // If for new R-Term, either `id`(=>classID) or `parentID` is null, both are.
    var f = extra => ({ str: 's', termType: 'R', ...extra });
    var g = extra => ({ str: 's',     type: 'R', instID: null, ...extra });
    to.createTermFromMatch(_termTEI(), f({ id: 'id3', parentID: null  }))
      .should.deep.equal(g({ classID: null , parentID: null  }));
    to.createTermFromMatch(_termTEI(), f({ id: null , parentID: 'id5' }))
      .should.deep.equal(g({ classID: null , parentID: null  }));
    to.createTermFromMatch(_termTEI(), f({ id: 'id3', parentID: 'id5' }))
      .should.deep.equal(g({ classID: 'id3', parentID: 'id5' }));

    // Discards interfering or extra properties from the match-object.
    t = to.createTermFromMatch(_termTEI(),
      { str: 's', id: 'id5', qq: 5, backup: 'X' });
    [t.qq, t.backup].should.deep.equal([undefined, undefined]);
  });


  it('keepCoreProps()', () => {
    // It returns a clone or different Object.
    var t  = _termTER({ aa: 7 });
    var t2 = to.keepCoreProps(t, {});
    t.aa = 8;
    expect(t2.aa).to.equal(undefined);

    // It only keeps 'core' properties, including the 'type'.
    to.keepCoreProps(_termTEC({
      isFocal: true,  queryOptions: { z: [] },
      minWidth: 10,  maxWidth: 20,  editWidth: 30
    })).should.deep.equal({ type: 'EC' });

    to.keepCoreProps(_term()).should.deep.equal({
      type: 'I', str: 'ab',  style: 'i', classID: 'A:01',  instID: 'id5' });

    to.keepCoreProps(_termTR()).should.deep.equal({
      type: 'R', str: 'a', classID: 'A:01', instID: 'id5', parentID: 'id3' });
  });


  it('prepForCopy()', () => {
    // It returns a clone or different Object.
    var t  = _termTER({ aa: 7 });
    var t2 = to.prepForCopy(t, {});
    t.aa = 8;
    expect(t2.aa).to.equal(undefined);

    // Keeps only 'core' properties from the Term, but
    // keeps `type` only for ER/EC/EL-Terms, and
    // makes `instID` null for R/I-Terms.
    to.prepForCopy(_term()).should.deep.equal({
      str: 'ab', style: 'i', classID: 'A:01', instID: null });
    to.prepForCopy(_termTR()).should.deep.equal({ str: 'a', classID: 'A:01',
      instID: null, parentID: 'id3' });
    to.prepForCopy(_termTI()).should.deep.equal({ str: 'a', classID: 'A:01',
      instID: null });
    to.prepForCopy(_termTC()).should.deep.equal({ str: 'a', classID: 'A:01' });
    to.prepForCopy(_termTL()).should.deep.equal({ str: 'a' });
    to.prepForCopy(_termTER()).should.deep.equal({ type: 'ER' });
    to.prepForCopy(_termTEI()).should.deep.equal({            });
    to.prepForCopy(_termTEC()).should.deep.equal({ type: 'EC' });
    to.prepForCopy(_termTEL()).should.deep.equal({ type: 'EL' });

    // It can return a Term that is set up as a child-term of a given R/I-Term.
    to.prepForCopy(_term(), true).should.deep.equal({ str: 'ab', style: 'i',
      classID: 'A:01', instID: null, parentID: 'id5' });
    to.prepForCopy(_termTR(), true).should.deep.equal({ str: 'a',
      classID: 'A:01', instID: null, parentID: 'id5' });
    to.prepForCopy(_termTI(), true).should.deep.equal({ str: 'a',
      classID: 'A:01', instID: null, parentID: 'id5' });
  });


  it('prepForPaste()', () => {
    // It returns a clone or different Object from both given Terms.
    var t  = _termTEI();
    var t2 = _termTER({ aa: 7 });
    var t3 = to.prepForPaste(t, t2);
    t .aa = 8;
    t2.aa = 9;
    expect(t3.aa).to.equal(undefined);

    // It can return a Term with:  - pasted `str`,
    // - removed `style` when needed,  - removed `label`,
    // - pasted `type`,  - pasted IDs,  - whereby `instID` is made null,
    // - and keeping all other properties as they were before.
    t = to.prepForPaste(
      _term(),
      { str: 'p',  classID: 'X:99', instID: 'id3', parentID: 'id5' }
    ).should.deep.equal({
      str: 'p',  classID: 'X:99',  instID: null,  parentID: 'id5', type: 'R',
      queryOptions: { z: [] },  minWidth: 10,  maxWidth: 20,  editWidth: 30,
      x: 1,  y: 1,  width: 8, height: 4,
      isFocal: true,  isEndTerm: true,  key: 'xx',  aa: { bb: 1 }
    });

    // It can paste an I-Term in a non-EI-type Edit-Term.
    t = to.prepForPaste(
      _termTEC(),
      { str: 'p', style: 'b', classID: 'X:99', instID: null }
    ).should.deep.equal({
      str: 'p',  style: 'b',  classID: 'X:99',  instID: null,  type: 'I' });

    // It can paste a copied Term.
    t = to.prepForPaste(
      _termTEI(),
      to.prepForCopy(_termTI())
    ).should.deep.equal({ type: 'I', str: 'a', classID: 'A:01', instID: null });
  });
});
