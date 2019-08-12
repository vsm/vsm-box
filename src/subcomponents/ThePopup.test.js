import ThePopup from './ThePopup.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/ThePopup', () => {


  var w;  // Each test will assign its created ThePopup component to this var.


  const dict = new VsmDictionaryLocal({
    dictData: [
      { id: 'http://xy.org/DA', abbrev: 'A', name: 'Aaa', entries: [
        { id: 'http://xy.org/DA/A:01', descr: 'ddaa',
          terms: [ { str: 'ax', descr: 'a0', style: 'i' } ],
          z: { a: 123, b: 45}
        },
      ]},
      { id: 'http://xy.org/DB', abbrev: 'B', entries: [
        { id: 'http://xy.org/DB/B:01', terms: [{ str: 'bx', descr: 'b0' }] },
      ]},
      { id: 'http://xy.org/DC', name: 'Ccc', entries: [
        { id: 'http://xy.org/DC/C:01', terms: [{ str: 'cx', descr: 'c0' }] },
      ]},
      { id: 'http://xy.org/DD', entries: [
        { id: 'http://xy.org/DD/D:01', terms: [{ str: 'dx', descr: 'd0' }] },
        { id: 'http://xy.org/DD/D:02', terms: [{ str: 'dy' }] }
      ]},
    ],
    refTerms: ['it'],
    delay: 100
  });

  const p = 'http://xy.org/';  // URI-prefix, used in some later tests.

  var   lastGEOpt = [];  // Logs `options` from the last `getEntries()` call.
  var   lastGDOpt = [];  // Logs `options` from the last `getDictInfos()` call.
  const origGetEntries   = dict.getEntries  .bind(dict);
  const origGetDictInfos = dict.getDictInfos.bind(dict);
  dict.getEntries   = (op, cb) => lastGEOpt.push(op) + origGetEntries  (op, cb);
  dict.getDictInfos = (op, cb) => lastGDOpt.push(op) + origGetDictInfos(op, cb);

  beforeEach(() => { lastGEOpt = [];  lastGDOpt = [] });  // Rest for each test.


  var clock; // For using fake timers. See description @VsmAutocomplete.test.js.
  beforeEach(() => { clock = sinon.useFakeTimers() });
  afterEach (() => { clock.restore() });

  const make = (term, props = {}) => {
    w = mount(ThePopup, {
      propsData: Object.assign(
        {
          term: Object.assign(   // Provide some of term's required properties.
            { x: 2, y: 10, width: 20, height: 10 },
            term || {}
          ),
          index: 55,  // (Some easily recognizable value).
          vsmDictionary: dict,
          sizes: { widthScale: 1 },
          ///allowClassNull: true,
          ///termMargin: { left: 0, right: 0 },
          ///customPopup: false,  /// x => x.strs,
          ///termCopy: false,
          ///termPaste: false,
        },
        props
      )
    });
  };


  // --- UTILITY FUNCTIONALITY ---

  const _info    = () => w.find('.popup .info');
  const _term    = () => _info().find('.info-term');
  const _sett    = () => _info().find('.info-settings');
  const _iExtra1 = () => _info().find('.info-extra1');
  const _iExtra2 = () => _info().find('.info-extra2');

  const _str   = () => _term().find('.str');
  const _descr = () => _term().find('.descr');
  const _dict  = () => _term().find('.dict');
  const _cid   = () => _term().find('.ids .class-id');
  const _pid   = () => _term().find('.ids .parent-id');
  const _iid   = () => _term().find('.ids .inst-id');

  const _qFilt  = () => _sett().find   ('.query-filter');
  const _qFiltD = () => _sett().findAll('.query-filter div');
  const _qSort  = () => _sett().find   ('.query-sort');
  const _qSortD = () => _sett().findAll('.query-sort div');
  const _qIdts  = () => _sett().find   ('.query-fixedterms');
  const _qIdtsD = () => _sett().findAll('.query-fixedterms div');
  const _qZ     = () => _sett().find   ('.query-z');

  const _plh    = () => _sett().find   ('.placeholder');

  const _widths = () => _sett().find('.widths');
  const _iWid   = () => _sett().find('.min-width');
  const _aWid   = () => _sett().find('.max-width');
  const _eWid   = () => _sett().find('.edit-width');
  const _wScale = () => _sett().find('.width-scale');

  const _menu    = () => w.find('.popup .menu');
  const _mExtra1 = () => _menu().find('.menu-extra1');
  const _mExtra2 = () => _menu().find('.menu-extra2');

  const _edit     = () => _menu().find('.item.edit');
  const _undoEdit = () => _menu().find('.item.undo-edit');
  const _copy     = () => _menu().find('.item.copy');
  const _copyRef  = () => _menu().find('.item.copy-ref');
  const _paste    = () => _menu().find('.item.paste');
  const _types    = () => _menu().find('.item.types');
  const _typeRef   = () => _types().find('.type.ref');
  const _typeInst  = () => _types().find('.type.inst');
  const _typeClass = () => _types().find('.type.class');
  const _typeLit   = () => _types().find('.type.lit');
  const _reset    = () => _menu().find('.item.reset');
  const _resetHk  = () => _menu().find('.item.reset .hotkey');
  const _focal    = () => _menu().find('.item.focal');
  const _insert   = () => _menu().find('.item.insert');
  const _remove   = () => _menu().find('.item.remove');
  const _help     = () => _menu().find('.help');

  const _click = wrap => wrap.trigger('click');


  // See 'Term.test.js' for info on `_emit*()`.
  const _emit = (index = 0, str = '-') => {
    var emit = w.emitted(str);
    return emit !== undefined  &&  emit[index] !== undefined;
  };
  const _emitL = (index = 0, str = '-') => {
    return _emit(index, str) ? w.emitted(str)[index] : false;
  };
  const _emitV = (index = 0, str = '-') =>
    _emit(index, str) ? w.emitted(str)[index][0] : false;


  // Shorthand functions.
  const vueTick = cb => Vue.nextTick(() => { clock.tick(10);  cb() });
  const DE = () => D(w.emittedByOrder());  // eslint-disable-line no-unused-vars




  // --- THE TESTS ---

  it('initializes, when getting only the required props', () => {
    make({ str: 'aa', type: 'L' });
    w.isVueInstance().should.equal(true);
  });


  it('emits `mouseenter`/`mouseleave` when hovered/unhovered ', () => {
    make({ str: 'aa', type: 'L' });
    w.trigger('mouseenter');
    _emit(0, 'mouseenter').should.equal(true);
    w.trigger('mouseleave');
    _emit(0, 'mouseleave').should.equal(true);
  });


  describe('the info-panel', () => {

    it('shows a term\'s string, descr, dictionary, ids, and settings ' +
       '[intro test]', () => {
      make({
        str: 'ax', classID: 'http://xy.org/DA/A:01', instID: null,
        descr: 'dd', dictID: 'http://xy.org/DA', type: 'I',
        placeholder: 'plh', minWidth: 30
      });
      ///H(_info());
      _str  ().text().should.equal('ax');
      _descr().text().should.equal('dd');
      _dict ().text().should.equal('[DA]');
      _cid  ().text().should.equal('A:01');
      _iid  ().text().should.equal('…');
      _plh  ().text().should.equal('plh');
      _iWid ().text().should.equal('30');
      [ _pid(),
        _qFilt(), _qSort(), _qIdts(), _qZ(),
        _aWid(), _eWid(), _wScale()
      ].forEach(wrap => wrap.exists().should.equal(false));

      clock.tick(100);
      _dict ().text().should.equal('Aaa (A)');  // Updated after query.
    });


    it('hides info-panel for Edit-Terms and L-Terms, with no query- or ' +
       'width-settings', () => {
      ['ER', 'EI', 'EC', 'EL'].forEach(type => {
        make({ type });
        _info().exists().should.equal(false);
      });

      make({ str: 'aa', type: 'L' });
      _info().exists().should.equal(false);
    });


    it('shows info-panel and term-panel, but not settings-panel, for ' +
       'an R/I/C-Term with no special settings', () => {
      function test() {
        _info().exists().should.equal(true);
        _term().exists().should.equal(true);
        _sett().exists().should.equal(false);
      }
      make({ str: 'aa', type: 'C', classID: null });                test();
      make({ str: 'aa', type: 'I', classID: null, instID: null });  test();
      make({ str: 'aa', type: 'R', classID: null, instID: null, parentID: null});
      test();
    });


    it('shows info-panel and settings-panel, but not term-panel, for ' +
       'an Edit-Term or L-Term, with a width-setting', () => {
      function test() {
        _info().exists().should.equal(true);
        _term().exists().should.equal(false);
        _sett().exists().should.equal(true);
      }
      make({ type: 'EI', minWidth: 20            });  test();
      make({ type: 'L',  minWidth: 20, str: 'aa' });  test();
    });


    it('shows `term.str` in str-panel, and applies `term.style`', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      _str().text().should.equal('ax');

      make({ str: 'x', style: 'i', classID: 'http://xy.org/DA/xx', type: 'C' });
      _str().html().includes('<i>x</i>').should.equal(true);
    });


    it('if `term.descr` is given, shows it in the descr-panel', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        descr: 'a0'
      });
      _descr().text().should.equal('a0');
    });


    it('..and if not given, shows it as \'\'; then shows it after ' +
       'querying & receiving it', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      _descr().text().should.equal('');
      clock.tick(100);
      _descr().text().should.equal('a0');
    });


    it('..and if not received, shows it as \'-\'', () => {
      // Here VsmDictionary won't return an entry for classID 'QQQ'.
      make({ str: 'ax', classID: 'QQQ', type: 'C' });
      _descr().text().should.equal('');
      clock.tick(100);
      _descr().text().should.equal('-');
    });


    it('does not overwrite non-empty `descr` (received via VsmBox\'s ' +
       '`initialValue`) with empty one from a query result', () => {
      make({ str: 'dy', classID: 'http://xy.org/DD/D:02', type: 'C',
        descr: 'my' });
      _descr().text().should.equal('my');
      clock.tick(100);
      _descr().text().should.equal('my');
    });


    it('queries & receives term-info (`descr`) for a classID, both with and ' +
       'without a dictID; but not with invalid dictID', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      clock.tick(100);
      _descr().text().should.equal('a0');

      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        dictID: 'http://xy.org/DA'
      });
      clock.tick(100);
      _descr().text().should.equal('a0');

      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        dictID: 'QQQ'
      });
      clock.tick(100);
      _descr().text().should.equal('-');
    });


    it('if `term.dictID` is given, shows it as [dictID\'s-URI-tail] in the ' +
       'dict-panel', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        dictID: 'http://xy.org/DA' });
      _dict().text().should.equal('[DA]');
    });


    it('..and when dictInfo-data is received, shows it as ' +
       '\'Name (abbrev)\'', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C', descr: 'x',
        dictID: 'http://xy.org/DA' });
      clock.tick(200);  // Wait for more than 100ms, just in case a term-info..
      //                // ..would be made, before the required dictInfo-query.
      _dict().text().should.equal('Aaa (A)');
    });


    it('..or without name, shows it as \'(abbrev)\'', () => {
      make({ str: 'ax', classID: 'http://xy.org/DB/B:01', type: 'C', descr: 'x',
        dictID: 'http://xy.org/DB' });
      clock.tick(200);
      _dict().text().should.equal('(B)');
    });


    it('..or without abbrev, shows it as \'Name\' ' +
       '[dictID\'s-URI-tail]', () => {
      make({ str: 'ax', classID: 'http://xy.org/DC/C:01', type: 'C', descr: 'x',
        dictID: 'http://xy.org/DC' });
      clock.tick(200);
      _dict().text().should.equal('Ccc [DC]');
    });


    it('..or without name nor abbrev, shows it as ' +
       '\'[dictID\'s-URI-tail]\'', () => {
      make({ str: 'ax', classID: 'http://xy.org/DD/D:01', type: 'C', descr: 'x',
        dictID: 'http://xy.org/DD' });
      clock.tick(200);
      _dict().text().should.equal('[DD]');
    });


    it('if no `term.dictID` is given, shows it as \'\'', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        descr: 'x' });
      _dict().text().should.equal('');

      // Version without given `descr`: same result.
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      _dict().text().should.equal('');
    });


    it('..and shows it as \'-\' if it is not received in queried ' +
       'term-info', () => {
      make({ str: 'ax', classID: 'QQQ', type: 'C' });
      clock.tick(100);
      _dict().text().should.equal('-');
    });


    it('..and shows it as [dictID] if it gets received in queried ' +
       'term-info', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      clock.tick(100);
      _dict().text().should.equal('[DA]');
    });


    it('..and then shows it again as \'Name (abbrev)\' when dictInfo-data ' +
       'is received', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      clock.tick(200);
      _dict().text().should.equal('Aaa (A)');
    });


    it('updates `descr` with the received value, in case it queries for ' +
       'term-info anyway', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        descr: 'outdated descr' });
      _descr().text().should.equal('outdated descr');
      clock.tick(100);
      _descr().text().should.equal('a0');  // `descr` now comes from the dict.
    });


    it('shows not-given `descr`/`dict` immediately as \'-\', for R/I/C-terms ' +
       'with `classID=null` (as it will not query for null classID)', () => {
      function testCase(type) {
        lastGEOpt = [];
        make({ str: 'ax', type, classID: null });
        _descr().text().should.equal('-');
        _dict ().text().should.equal('-');
        clock.tick(1000);
        lastGEOpt.length.should.equal(0);  // Also, it made no getEntries() call.
      }
      ['R', 'I', 'C'].forEach(type => testCase(type, 3));
    });


    it('shows the (URI-tail of the) classID for a C-type Term, ' +
       'with … if null', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      _cid().text().should.equal('A:01');
      _pid().exists().should.equal(false);
      _iid().exists().should.equal(false);

      make({ str: 'ax', classID: null, type: 'C' });
      _cid().text().should.equal('…');
    });


    it('shows the classID and instID for an I-type Term, with … for ' +
       'nulls', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01',
        instID: 'http://mydomain.org/i012345', type: 'I' });
      _cid().text().should.equal('A:01');
      _pid().exists().should.equal(false);
      _iid().text().should.equal('i012345');

      make({ str: 'ax', classID: null, instID: null, type: 'I' });
      _cid().text().should.equal('…');
      _pid().exists().should.equal(false);
      _iid().text().should.equal('…');
    });


    it('shows the class/parent/instID for an R-type Term, with … for ' +
       'nulls', () => {
      make({ str: 'it', classID: 'http://xy.org/DA/A:01',
        parentID: 'http://mydomain.org/i012345',
        instID: 'http://mydomain.org/i012398', type: 'R' });
      _cid().text().should.equal('A:01');
      _pid().text().should.equal('i012345');
      _iid().text().should.equal('i012398');

      make({ str: 'it', classID: null, instID: null, parentID: null, type:'R' });
      _cid().text().should.equal('…');
      _pid().text().should.equal('…');
      _iid().text().should.equal('…');
    });


    it('shows a URI-type class/parent/instID embedded in a link', () => {
      var classID  = 'http://xy.org/DA/A:01';
      var parentID = 'http://mydomain.org/i012345';
      var instID   = 'http://mydomain.org/i012398';
      make({ str: 's', classID, parentID, instID, type: 'R' });
      _cid().find('a').attributes().href.should.equal(classID);
      _pid().find('a').attributes().href.should.equal(parentID);
      _iid().find('a').attributes().href.should.equal(instID);

      make({ str: 'a', classID: null, instID: null, parentID: null, type: 'R' });
      _cid().find('a').exists().should.equal(false);
      _pid().find('a').exists().should.equal(false);
      _iid().find('a').exists().should.equal(false);
    });


    it('hides parentID/instID/classID after its Term changed type R->I, ' +
       'I->C, C->L resp.', () => {
      // Note: a Term's type is only changed by updating its `type`,
      // and any IDs that it had will remain present in the received data.
      // So here we simulate this via a Term that has all 3 IDs, but type != 'R'.
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01',
        instID: 'ii123', parentID: 'ii120', type: 'I' });
      clock.tick(1000);
      _pid().exists().should.equal(false);
      _iid().text().should.equal('ii123');
      _cid().text().should.equal('A:01');

      make({ str: 'ax', classID: 'http://xy.org/DA/A:01',
        instID: 'ii123', parentID: 'ii120', type: 'C' });
      clock.tick(1000);
      _pid().exists().should.equal(false);
      _iid().exists().should.equal(false);
      _cid().text().should.equal('A:01');

      make({ str: 'ax', classID: 'http://xy.org/DA/A:01',
        instID: 'ii123', parentID: 'ii120', type: 'L' });
      clock.tick(1000);
      w.find('.popup .info .info-term .ids').exists().should.equal(false);
    });


    it('show both classID and parentID as …, after I-type Term with not-null ' +
       'IDs is changed to R-type; and shows original instID', () => {
      // Note: as in the previous test, we simulate the I->...->R type change
      // via a Term that has not-null classID&instID, but null parentID.
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01',
        instID: 'ii123', parentID: null, type: 'R' });
      clock.tick(1000);
      _pid().text().should.equal('…');
      _iid().text().should.equal('ii123');
      _cid().text().should.equal('…');
    });


    it('shows `term.queryOptions.filter/sort.dictID` list in settings-panel: ' +
       'each as \'Name (abbrev)\' (etc, as for term.dictID) per line', () => {
      function testCase(key, func) {
        make({ str: 'ax', type: 'L', queryOptions: {
          [key]: { dictID: [p + 'DA', p + 'DD', p + 'DB', p + 'DC'] }
        } });

        // Part 1: it just shows the given dictID.
        var wraps = func();
        wraps.length.should.equal(4);
        wraps.at(0).text().should.equal('[DA]');
        wraps.at(2).text().should.equal('[DB]');
        wraps.at(3).text().should.equal('[DC]');
        wraps.at(1).text().should.equal('[DD]');

        // Part 2: after dictInfo-data comes in, it updates the text.
        clock.tick(200);
        wraps = func();  // Get updated content.
        wraps.at(0).text().should.equal('Aaa (A)');
        wraps.at(2).text().should.equal('(B)');
        wraps.at(3).text().should.equal('Ccc [DC]');
        wraps.at(1).text().should.equal('[DD]');
      }

      testCase('filter', _qFiltD);
      testCase('sort',   _qSortD);
    });


    it('shows `term.idts` fixedTerms list: as \'str [id URI-tail]\', or just ' +
       '\'[id]\'; and updates when any necessary query results come in', () => {
      make({ str: 'ax', type: 'L', queryOptions: {
        idts: [
          { id: 'http://xy.org/DA/A:01', str: 'ax' },
          { id: 'http://xy.org/DB/B:01' },
          { id: 'http://xy.org/DQ/QQQ' },
        ]
      } });
      var wraps = _qIdtsD();
      wraps.length.should.equal(3);
      wraps.at(0).text().should.equal('ax [A:01]');
      wraps.at(1).text().should.equal('[B:01]');
      wraps.at(2).text().should.equal('[QQQ]');

      clock.tick(100);
      wraps = _qIdtsD();
      wraps.at(0).text().should.equal('ax [A:01]');
      wraps.at(1).text().should.equal('bx [B:01]');  // Updated with B:01-data.
      wraps.at(2).text().should.equal('[QQQ]'); // No new data for invalid 'QQQ'.
    });


    it('shows fixedTerm strings with styling applied, after it receives ' +
       'query results', () => {
      make({ str: 'ax', type: 'L', queryOptions: {
        idts: [{ id: 'http://xy.org/DA/A:01', str: 'ax' }]
      } });
      _qIdtsD().at(0).text().should.equal('ax [A:01]');
      _qIdtsD().at(0).html().includes('<i>ax</i>').should.equal(false);

      clock.tick(100);
      _qIdtsD().at(0).text().should.equal('ax [A:01]');
      _qIdtsD().at(0).html().includes('<i>ax</i>').should.equal(true);
    });


    it('if a fixedTerm\'s `id` but not `str` is present in the dictionary: ' +
       'shows it as received entry\'s first term (& style) instead', () => {
      make({ str: 'ax', type: 'L', queryOptions: {
        idts: [{ id: 'http://xy.org/DA/A:01', str: 'invalid' }]
      } });
      _qIdtsD().at(0).text().should.equal('invalid [A:01]');

      clock.tick(100);
      _qIdtsD().at(0).text().should.equal('ax [A:01]');
      _qIdtsD().at(0).html().includes('<i>ax</i>').should.equal(true);
    });


    it('shows `term.z` (z-object-properties-filter) list on one line', () => {
      make({ str: 'ax', type: 'L', queryOptions: { z: [ 'abc', 'def' ] } });
      _qZ().text().should.equal('abc, def');
    });


    it('shows `term.z` as \'(none)\' if it is an empty list', () => {
      make({ str: 'ax', type: 'L', queryOptions: { z: [] } });
      _qZ().text().should.equal('(none)');
    });


    it('hides `term.z` it is `true` or `undefined`, when another setting ' +
       'is still given (which keeps settings-panel shown)', () => {
      make({ str: 'ax', type: 'L', queryOptions: {
        idts: [{ id: 'q' }],  z: true
      }});
      _sett().exists().should.equal(true);
      _qZ()  .exists().should.equal(false);

      make({ str: 'ax', type: 'L', queryOptions: {
        idts: [{ id: 'q' }]
      }});
      _sett().exists().should.equal(true);
      _qZ()  .exists().should.equal(false);
    });


    it('shows `placeholder`', () => {
      make({ str: 'ax', type: 'L', placeholder: 'test' });
      _plh().text().should.equal('test');
    });


    it('shows `min/max/editWidth` in their respective sections', () => {
      make({ str: 'ax', type: 'L', minWidth: 10, maxWidth: 20, editWidth: 30 });
      _iWid().text().should.equal('10');
      _aWid().text().should.equal('20');
      _eWid().text().should.equal('30');
    });


    it('shows only `editWidth` if min- and maxWidth are not given', () => {
      make({ str: 'ax', type: 'L', editWidth: 50 });
      _iWid().exists().should.equal(false);
      _aWid().exists().should.equal(false);
      _eWid().text().should.equal('50');
    });


    it('shows `scaleWidth` (rounded to max. 2 decimals), only if ' +
       '`sizes.scaleWidth` is present and differs from 1', () => {
      // Note: `queryOptions`, below, makes settings-panel exist in each test.
      var term = { str: 'ax', type: 'L', queryOptions: { z: [] } };
      make(term, { sizes: { } });
      _wScale().exists().should.equal(false);

      make(term, { sizes: { widthScale: 1 } });
      _wScale().exists().should.equal(false);

      make(term, { sizes: { widthScale: 1.3 } });
      _wScale().text().should.equal('1.3');

      make(term, { sizes: { widthScale: 1.335 } });
      _wScale().text().should.equal('1.34');
    });


    it('hides the filter/sort/fts/plh/widths if empty, when the z setting ' +
       'is still given (which keeps settings-panel shown)', () => {
      make({ str: 'ax', type: 'L', queryOptions: { z: [] } });
      _sett  ().exists().should.equal(true);
      _qFilt ().exists().should.equal(false);
      _qSort ().exists().should.equal(false);
      _qIdts ().exists().should.equal(false);
      _qZ    ().exists().should.equal(true);
      _plh   ().exists().should.equal(false);
      _widths().exists().should.equal(false);
    });


    it('updates all content when prop `term` changes', cb => {
      // Give an initial Term, and wait for the launched queries to return data.
      make({
        str: 'ax', classID: 'http://xy.org/DA/A:01', instID: null,
        descr: 'dd', dictID: 'http://xy.org/DA', type: 'I',
        minWidth: 30
      });
      _str ().text().should.equal('ax');
      _dict().text().should.equal('[DA]');
      _iWid().text().should.equal('30');
      clock.tick(100);
      _dict ().text().should.equal('Aaa (A)');
      clock.tick(1000);

      vueTick(() => {
        // Give a different term, check the result now, & when new data arrives.
        w.setProps({ term: { x: 22, y: 10, width: 20, height: 10,
          str: 'bx', type: 'R',
          classID: 'http://xy.org/DB/B:01', instID: null, parentID: 'pp123',
          placeholder: 'name',
          maxWidth: 150, editWidth: 200,
          queryOptions: {
            filter: { dictID: [p + 'DA', p + 'DC'] },
            sort: { dictID: [p + 'DA'] },  idts: [{ id: 'q' }],  z: ['abcd']
          }
        }});
        _str   ().text().should.equal('bx');
        _descr ().text().should.equal('');
        _dict  ().text().should.equal('');
        _cid   ().text().should.equal('B:01');
        _pid   ().text().should.equal('pp123');
        _iid   ().text().should.equal('…');
        _qFiltD().length.should.equal(2);
        _qFiltD().at(0).text().should.equal('[DA]');
        _qFiltD().at(1).text().should.equal('[DC]');
        _qSortD().length.should.equal(1);
        _qSortD().at(0).text().should.equal('[DA]');
        _qIdtsD().length.should.equal(1);
        _qZ    ().text().should.equal('abcd');
        _plh   ().text().should.equal('name');
        _iWid().exists().should.equal(false);
        _aWid  ().text().should.equal('150');
        _eWid  ().text().should.equal('200');

        clock.tick(100);  // Wait until it queried&receives more term data.
        _descr ().text().should.equal('b0');
        _dict  ().text().should.equal('[DB]');

        clock.tick(100);  // Wait until it receives dictInfo data.
        _dict  ().text().should.equal('(B)');
        _qFiltD().at(1).text().should.equal('Ccc [DC]');

        clock.tick(1000);
        vueTick(cb);
      });
    });


    it('discards term and fixedTerm query-results if prop `term` changed ' +
        'meanwhile', () => {
      const descr = s => _descr ()      .text().should.equal(s);
      const fixtm = s => _qIdtsD().at(0).text().should.equal(s);

      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C',
        queryOptions: { idts: [{ id: 'http://xy.org/DD/D:01' }] }
      });
      descr('');
      fixtm('[D:01]');

      // 50ms before term-data comes in, change the `term` prop.
      clock.tick(50);
      descr('');        // No update yet.
      fixtm('[D:01]');

      w.setProps({ term: { x: 22, y: 10, width: 20, height: 10,
        str: 'bx', classID: 'http://xy.org/DB/B:01', type: 'C',
        queryOptions: { idts: [{ id: 'http://xy.org/DD/D:01' }] }
      }});

      clock.tick(99);
      descr('');        // Still no update; it discarded query 1.
      fixtm('[D:01]');

      clock.tick(1);
      descr('b0');         // Now it got updated.
      fixtm('dx [D:01]');

      clock.tick(1000);
    });


    it('discards dictInfo query-results if prop `term` changed ' +
       'meanwhile', () => {
      make({ str: 'ax', classID: 'http://xy.org/DA/A:01', type: 'C' });
      _dict().text().should.equal('');
      clock.tick(100);
      _dict().text().should.equal('[DA]');  // Update 1, from received term-data.

      // 50ms before dictInfo-data comes in, change the `term` prop.
      clock.tick(50);
      _dict().text().should.equal('[DA]');  // No update 2 yet.

      w.setProps({ term: { x: 22, y: 10, width: 20, height: 10,
        str: 'bx', classID: 'http://xy.org/DB/B:01', type: 'C' }});

      _dict().text().should.equal('');
      clock.tick(50);
      _dict().text().should.equal('');  // No update, so it discarded stale data.
      clock.tick(50);
      _dict().text().should.equal('[DB]');  // Update 1, from received term-data.
      clock.tick(99);
      _dict().text().should.equal('[DB]');
      clock.tick(1);
      _dict().text().should.equal('(B)');  // Update 2, from dictInfo-data.

      clock.tick(1000);
    });


    it('queries term-data only for R/I/C-type Terms with not-null ' +
       '`classID`', () => {
      function testCase(type, classID, shouldQueryGetEntries) {
        lastGEOpt = [];
        make({ str: 'ax', type, classID, instID: null, parentID: null });
        clock.tick(100);
        lastGEOpt.length.should.equal(shouldQueryGetEntries ? 1 : 0);
        clock.tick(1000);
      }

      var id = 'http://xy.org/DA/A:01';
      ['R', 'I',  'C'             ].forEach(type => testCase(type, id, true));
      ['L', 'ER', 'EI', 'EC', 'EL'].forEach(type => testCase(type, id, false));
      ['R' , 'I' , 'C' , 'L', 'ER', 'EI', 'EC', 'EL']
        .                           forEach(type => testCase(type, null, false));
    });


    it('does not query term-data, only if both `descr` and `dictID` are ' +
       'known', () => {
      function testCase(descr, dictID, shouldQueryGetEntries) {
        lastGEOpt = [];
        make({ str: 'ax', type: 'C', classID: 'http://xy.org/DA/A:01',
          descr, dictID });
        clock.tick(100);
        lastGEOpt.length.should.equal(shouldQueryGetEntries ? 1 : 0);
        clock.tick(1000);
      }

      [ [undefined, undefined         , true ],
        ['a0',      undefined         , true ],
        [undefined, 'http://xy.org/DA', true ],
        ['a0',      'http://xy.org/DA', false]].forEach(arr => testCase(...arr));
    });


    it('queries `term.z` only for R/I/C-type terms and with the prop ' +
       '`customPopup` given', () => {
      function testCase(type, customFunc, shouldGetZObj) {
        make(
          { str: 'ax', type, classID: 'http://xy.org/DA/A:01',
            instID: null, parentID: null,
            queryOptions: { z: ['a'] }
          },
          customFunc ? { customPopup: x => x.strs } : {}
        );
        clock.tick(100);

        // Test the querying of `term.z` via `lastGEOpt[0]`.
        var opt = lastGEOpt.pop();
        if (shouldGetZObj)  opt.z.length.should.equal(1);
        else  (!opt || !opt.z ||
          (Array.isArray(opt.z) && !opt.z.length)) .should.equal(true);

        // Alternatively, test it via the query result stored in the view-model.
        w.vm.zObj.should.deep.equal(shouldGetZObj ? { a: 123 } : { });
        clock.tick(1000);
      }

      var func   = true;
      var noFunc = false;
      ['R', 'I',  'C'             ].forEach(type => testCase(type, func, true));
      ['L', 'ER', 'EI', 'EC', 'EL'].forEach(type => testCase(type, func, false));
      ['R', 'I' , 'C' , 'L',  'ER', 'EI', 'EC', 'EL']
        .                           forEach(type => testCase(type,noFunc,false));
    });


    it('queries `queryOptions`\'s `dictID`s for all Term types', () => {
      function testCase(type, dictIDCount) {
        lastGEOpt = [];
        lastGDOpt = [];
        make({
          str: 'ax', type, classID: 'http://xy.org/DA/A:01',
          instID: null, parentID: null,
          queryOptions: {
            filter: { dictID: ['http://xy.org/DB'] },
            sort:   { dictID: ['http://xy.org/DC'] }
          }
        });
        clock.tick(100);
        lastGDOpt.length.should.equal(1);
        lastGDOpt[0].filter.id.length.should.equal(dictIDCount);
        clock.tick(1000);
      }
      // Note: R/I/C query for term's 1 dictID, plus queryOptions 2 dictIDs.
      ['R', 'I', 'C']               .forEach(type => testCase(type, 3));
      ['L', 'ER', 'EI', 'EC', 'EL'] .forEach(type => testCase(type, 2));
    });


    it('lets prop `custom-popup` update all content; gives it all ' +
       'necessary data; and updates after receiving query results', () => {
      make(
        {
          str: 'ax', descr: 'stored', style: 'i', type: 'R',
          dictID: 'http://xy.org/DA',
          classID: 'http://xy.org/DA/A:01', parentID: 'pp123', instID: null,
          queryOptions: {
            filter: { dictID: ['http://xy.org/DB'] },
            sort:   { dictID: ['http://xy.org/DC'] },
            idts: [ { id: 'http://xy.org/DD/D:01' } ],
            z:    ['a']
          },
          placeholder: 'plh',
          minWidth: 10, maxWidth: 20, editWidth: 30
        },
        { customPopup: function(o) {
          // Use all of o's properties: term, type, dictInfo, z, vsmDict., strs,
          // and all o.strs' subprops (incl. all queryFilter/Sort/Idts-elements).
          var f = s => '_<b>' + s + '</b>_';
          o.strs.str   = f(o.strs.str);
          o.strs.descr = f(o.strs.descr);
          o.strs.dict  = f(o.strs.dict);
          o.strs.classID  = f(o.strs.classID);
          o.strs.instID   = f(o.strs.instID);
          o.strs.parentID = f(o.strs.parentID);
          o.strs.queryFilter     = o.strs.queryFilter    .map(f);
          o.strs.querySort       = o.strs.querySort      .map(f);
          o.strs.queryFixedTerms = o.strs.queryFixedTerms.map(f);
          o.strs.queryZ = f(o.strs.queryZ),
          o.strs.placeholder = f(o.strs.placeholder),
          o.strs.minWidth  = f(o.strs.minWidth),
          o.strs.maxWidth  = f(o.strs.maxWidth),
          o.strs.editWidth = f(o.strs.editWidth),
          o.strs.infoExtra1 = f('<i>Test1</i>');
          o.strs.infoExtra2 = f([
            '<i>Test2</i>',
            o.term.style,    // Tests that `o.term` is given.
            o.type,
            o.dictInfo.name, // dictInfo will be not-{} only after query returns.
            o.z.a,           // Also z will be not-{} after query results return.
            o.vsmDictionary.refTerms.length
          ].join(', '));
          o.strs.menuExtra1 = f('<i>Test3</i>');
          o.strs.menuExtra2 = f('<i>Test4</i>');
          return o.strs;
        }}
      );

      _str  ().html().includes('_<b><i>ax</i></b>_').should.equal(true);
      _str  ().text().should.equal('_ax_');
      _descr().text().should.equal('_stored_');
      _dict ().text().should.equal('_[DA]_');
      _cid().text().should.equal('_A:01_');
      _cid().find('a').attributes().href        // For a URI-type ID, it got..
        .should.equal('http://xy.org/DA/A:01'); // ..and kept the <a href> link.
      _pid().text().should.equal('_pp123_');
      _iid().text().should.equal('_…_');
      _qFiltD().at(0).text().should.equal('_[DB]_');
      _qSortD().at(0).text().should.equal('_[DC]_');
      _qIdts ().text().should.equal('_[D:01]_');
      _qZ    ().text().should.equal('_a_');
      _plh() .text().should.equal('_plh_');
      _iWid().text().should.equal('_10_');
      _aWid().text().should.equal('_20_');
      _eWid().text().should.equal('_30_');
      _iExtra1().html().includes('_<b><i>Test1</i></b>_').should.equal(true);
      _iExtra2().html().includes( '_<b><i>Test2</i>, i, R, , , 1</b>_')
        .should.equal(true);
      _mExtra1().html().includes('_<b><i>Test3</i></b>_').should.equal(true);
      _mExtra2().html().includes('_<b><i>Test4</i></b>_').should.equal(true);

      clock.tick(1000);  // Wait until all query results arrived.
      _descr().text().should.equal('_a0_');
      _dict ().text().should.equal('_Aaa (A)_');
      _qFiltD().at(0).text().should.equal('_(B)_');
      _qSortD().at(0).text().should.equal('_Ccc [DC]_');
      _qIdts ().text().should.equal('_dx [D:01]_');
      _iExtra2().html().includes( '_<b><i>Test2</i>, i, R, Aaa, 123, 1</b>_')
        .should.equal(true);
    });
  });



  describe('the menu-items; and their emits on Click', () => {
    // Note: relevant variables to show/hide/inactivate menu-items:
    //   term.type (ER/EI/EC/EL/R/I/C/L),  termCopy,  termPaste,  allowClassNull,
    //   term.classID (null/not),  term.instID (null/not),  term.isFocal

    const nonEditTypes = [ 'R',  'I',  'C',  'L'];
    const editTypes    = ['ER', 'EI', 'EC', 'EL'];
    const allTypes     = nonEditTypes.concat(editTypes);

    /**
     * A Term can have all three IDs, whatever its `term.type` is, because IDs
     * may be kept as a backup, in between Term-type changes. This function is
     * a shorthand to start from fully null-ID'ed Terms.
     */
    const make2 = (term, props) => make(Object.assign(
      {str: 'ax', classID: null, instID: null, parentID: null}, term), props);


    it('shows Edit, for non-Edit Terms only; and emits `edit` on ' +
       'click', () => {
      function testCase(type, ex) {  // Arg. `ex` is the result: "exists"-or-not.
        make2({ type });
        _edit().exists().should.equal(ex);
        clock.tick(1000);  // (Let any queries finish. Could also do this @end).
        if (ex) {  // If the 'Edit' menu-item exists in this case, click it.
          _click(_edit());
          _emitV(0, 'edit').should.equal(55);  // It emits 'edit' + `term.index`.
        }
      }
      nonEditTypes.forEach(type => testCase(type, true ));
      editTypes   .forEach(type => testCase(type, false));
    });


    it('shows Undo Edit, for Edit-Terms that were previously non-Edit ' +
       '(i.e. with a `backup` property) only; emits `undo-edit`', () => {
      function testCase(type, backup, ex) {
        make2({ type, backup });
        _undoEdit().exists().should.equal(ex);
        clock.tick(1000);
        if (ex) {
          _click(_undoEdit());
          _emitV(0, 'undo-edit').should.equal(55);
        }
      }
      editTypes   .forEach(type => testCase(type, {},        true ));
      editTypes   .forEach(type => testCase(type, undefined, false));
      nonEditTypes.forEach(type => testCase(type, undefined, false));
      nonEditTypes.forEach(type => testCase(type, {}, false)); //Shouldn't exist.
    });


    it('shows Copy and Copy Reference, for non-Edit Terms only', () => {
      function testCase(type, ex) {
        make2({ type });
        _copy   ().exists().should.equal(ex);
        _copyRef().exists().should.equal(ex);
        clock.tick(1000);
      }
      nonEditTypes.forEach(type => testCase(type, true ));
      editTypes   .forEach(type => testCase(type, false));
    });


    it('shows active Copy, for not-absent `termCopy` prop only; ' +
       'emits `copy`, else ignores clicks', () => {
      function testCase(type, termCopy, active) {
        make2({ type }, { termCopy });
        _copy().classes().includes('inactive').should.equal(!active);
        clock.tick(1000);
        _click(_copy());
        if (active)  _emitV(0, 'copy').should.equal(55);
        else         _emit (0, 'copy').should.equal(false);
      }
      nonEditTypes.forEach(type => testCase(type, () => {}, true ));
      nonEditTypes.forEach(type => testCase(type, false,    false));
    });


    it('shows active Copy Ref., with not-absent `termCopy`, R/I-type Terms, ' +
       'and not-null instID, only; emits `copy-ref`, else nothing', () => {
      function testCase(type, instID, termCopy, active) {
        make2({ type, instID }, { termCopy });
        _copyRef().classes().includes('inactive').should.equal(!active);
        clock.tick(1000);
        _click(_copyRef());
        if (active)  _emitV(0, 'copy-ref').should.equal(55);
        else         _emit (0, 'copy-ref').should.equal(false);
      }
      var func = () => {};
      testCase(  'R',  'id', func,  true );
      testCase(  'R',  'id', false, false);
      testCase(  'R',  null, func,  false);
      testCase(  'R',  null, false, false);
      testCase(  'I',  'id', func,  true );
      testCase(  'I',  'id', false, false);
      testCase(  'I',  null, func,  false);
      testCase(  'I',  null, false, false);
      ['C', 'L'].forEach(type => {
        testCase(type, 'id', func,  false);  // C/L-Terms are able to have..
        testCase(type, 'id', false, false);  // ..a not-null internal instID.
        testCase(type, null, func,  false);
        testCase(type, null, false, false);
      });
    });


    it('shows Paste, for Edit-Terms only', () => {
      function testCase(type, ex) {
        make2({ type });
        _paste().exists().should.equal(ex);
        clock.tick(1000);
      }
      editTypes   .forEach(type => testCase(type, true ));
      nonEditTypes.forEach(type => testCase(type, false));
    });


    it('shows active Paste, for not-absent `termPaste` prop only; ' +
       'emits `paste`, else ignores clicks', () => {
      function testCase(type, termPaste, active) {
        make2({ type }, { termPaste });
        _paste().classes().includes('inactive').should.equal(!active);
        clock.tick(1000);
        _click(_paste());
        if (active)  _emitV(0, 'paste').should.equal(55);
        else         _emit (0, 'paste').should.equal(false);
      }
      editTypes.forEach(type => testCase(type, () => {}, true ));
      editTypes.forEach(type => testCase(type, false,    false));
    });


    it('shows Type, with only the current Term-type\'s item selected', () => {
      function testCase(type, func) {
        make2({ type });
        [_typeRef, _typeInst, _typeClass, _typeLit].forEach(f =>
          f().classes().includes('selected').should.equal(f == func));
        clock.tick(1000);
      }
      [ ['R' , _typeRef],
        ['ER', _typeRef],
        ['I' , _typeInst],
        ['EI', _typeInst],
        ['C' , _typeClass],
        ['EC', _typeClass],
        ['L' , _typeLit],
        ['EL', _typeLit] ].forEach(arr => testCase(...arr));
    });


    it(['shows Set Type with Inst&Class-subitems inactive, for non-Edit-Terms',
      'with `null`/no internal `classID`, under `allowClassNull==false` only; ',
      'ignores clk on inactv./selected, else emits `set-type`+type [=128 tests]']
      .join('\n        '),
    () => {
      const _f = {
        R: _typeRef,
        I: _typeInst,
        C: _typeClass,
        L: _typeLit
      };

      function testCase(type, classID, allowClassNull, setType, active) {
        make2({ type, classID }, { allowClassNull });
        clock.tick(1000);

        var _subitem = _f[setType.replace('E', '')]();
        _subitem.classes().includes('inactive').should.equal(!active);
        _subitem.classes().includes('selected').should.equal(type == setType);
        _click(_subitem);

        // It emits only if the menu-item is active, AND the term does not have
        // that (base-)type already.
        var responds = active  &&  type != setType;
        if (responds)  _emitL(0, 'set-type').should.deep.equal([55, setType]);
        else           _emit (0, 'set-type').should     .equal(false);
        ///D({ i: i++, t: type, setType, a: active, resp: responds });
      }
      ///var i=0;

      function test4Cases(type, e, classID, allowClassNull, actArr, inactArr) {
        actArr.forEach(itemLabel => {
          testCase(type, classID, allowClassNull, e + itemLabel, true);
        });
        inactArr.forEach(itemLabel => {
          testCase(type, classID, allowClassNull, e + itemLabel, false);
        });
      }

      // Note: if !allowClassNull, and a Term with !classID would appear,
      // also then it will show the Inst and Class menu-subitems as inactive.
      var allFour = ['R', 'I', 'C', 'L'];
      nonEditTypes.forEach(type =>
        [ [null, false, ['R', 'L'], ['I', 'C']],
          [null, true , allFour, []],
          ['id', false, allFour, []],
          ['id', true , allFour, []] ].forEach(ar => test4Cases(type, '', ...ar))
      );
      editTypes.forEach(type =>
        [ [null, false, allFour, []],
          [null, true , allFour, []],
          ['id', false, allFour, []],
          ['id', true , allFour, []] ].forEach(ar => test4Cases(type, 'E',...ar))
      );
    });


    it('shows Reset Type for non-EI-type Edit-Terms, plus hotkey if endTerm; ' +
       'emits `set-type`+\'EI\'', () => {
      function testCase(type, isEndTerm, showsItem, showsHotkey) {
        make2({
          type,
          ...isEndTerm && { isEndTerm }
        });
        _reset  ().exists().should.equal(showsItem);
        _resetHk().exists().should.equal(showsHotkey);
        clock.tick(1000);
        if (showsItem) {
          _click(_reset());
          _emitL(0, 'set-type').should.deep.equal([55, 'EI']);
        }
      }
      [false, true].forEach(isEndTerm => {
        testCase('ER', isEndTerm, true , isEndTerm);
        testCase('EI', isEndTerm, false, false    );
        testCase('EC', isEndTerm, true , isEndTerm);
        testCase('EL', isEndTerm, true , isEndTerm);
      });
      nonEditTypes.forEach(type => testCase(type, false, false, false));
    });


    it('shows Make Focal or Unset As Focal, for non-focal or focal Terms ' +
       'resp.; emits `toggle-focal`', () => {
      function testCase(type, isFocal, showsMake) {
        make2(isFocal ? { type, isFocal } : { type });
        _focal().text().startsWith(showsMake ? 'Make focal' : 'Unset as focal')
          .should.equal(true);
        clock.tick(1000);
        _click(_focal());
        _emitV(0, 'toggle-focal').should.equal(55);
      }
      allTypes.forEach(type => testCase(type, true,  false));
      allTypes.forEach(type => testCase(type, false, true ));
    });


    it('shows Insert Term, for all Term types; emits `insert`', () => {
      function testCase(type) {
        make2({ type });
        _insert().exists().should.equal(true);
        clock.tick(1000);
        _click(_insert());
        _emitV(0, 'insert').should.equal(55);
      }
      allTypes.forEach(testCase);
    });


    it('shows Remove, for all Term types; emits `remove`', () => {
      function testCase(type) {
        make2({ type });
        _remove().exists().should.equal(true);
        clock.tick(1000);
        _click(_remove());
        _emitV(0, 'remove').should.equal(55);
      }
      allTypes.forEach(testCase);
    });


    it('does not show Make/Unset-Focal and Remove for the endTerm', () => {
      make2({ type: 'EI', isEndTerm: true });
      _focal ().exists().should.equal(false);
      _remove().exists().should.equal(false);
    });


    it('shows Help, for all Term types and also for endTerm; ' +
       'ignores clicks', () => {
      function testCase(term) {
        make2(term);
        _help().exists().should.equal(true);
        clock.tick(1000);
        var n = w.emittedByOrder().length;
        _click(_help());
        w.emittedByOrder().length.should.equal(n);  // No new emits after click.
      }
      allTypes .forEach(type => testCase({ type }));
      editTypes.forEach(type => testCase({ type, isEndTerm: true }));
    });
  });

});
