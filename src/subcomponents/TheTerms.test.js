import TheTerms from './TheTerms.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/TheTerms', () => {

  var w;  // Each test will assign its created TheTerms-component to this var.

  const dict = new VsmDictionaryLocal({
    dictData: [
      { id: 'A', name: 'Aaa', entries: [
        { id: 'A:01', dictID: 'A', terms: [{ str: 'aax', descr: 'ddx' }] },
        { id: 'A:02', dictID: 'A', terms: [{ str: 'aay', style: 'i' }] }
      ]}
    ],
    refTerms: ['it']
  });

  var clock; // For using fake timers. See description @VsmAutocomplete.test.js.
  beforeEach(() => { clock = sinon.useFakeTimers() });
  afterEach (() => { clock.runAll();  clock.restore() });

  const sizes = {  // Mock the `sizes` that parent component VsmBox would give.
    minWidth: 200,
    minEndTermWidth: 40,
    minEndTermWideWidth: 100,
    defaultEditWidth: 40,
    defaultMaxWidth: 0,
    widthScale: false,
    theConnsMarginBottom: 2,
    termDragThreshold: 3,
    delayPopupShow:   550,
    delayPopupSwitch: 300,
    delayPopupHide:   200
  };

  const TermHeight = 18;  // Used by the mocked getRuler() and in tests.
  const CharWidth  =  5;  // ". (Our mock gives all charachters the same width).


  // This function is used by each test. It creates and mounts a component with
  // default+custom props, and gives it extra functionality needed for tests.
  const make = (props, wait = 200, sync = true) => {
    w = mount(TheTerms, {
      propsData: Object.assign(
        { vsmDictionary: dict,
          maxStringLengths: {},
          freshListDelay: 0,
          origTerms: []
        },
        props,
        { sizes: Object.assign({}, sizes, props.sizes) }
      ),

      methods: {
        getRuler() {
          var ruler = this.$refs.ruler;

          // Make a (getter-based) property available on the ruler element.
          // Note: the ruler is only available at mount() time, which is when
          // measureSizes() already needs it. So sneak it in via getRuler().
          Object.defineProperty(ruler, 'offsetHeight',
            { get: function () { return TermHeight }, configurable: true });

          // Mock-calc. elem.-widths, as jsdom-global doesn't support computing
          // them (`getComputedStyle(w.vm.$el).getPropertyValue('width') == ''`).
          ruler.getBoundingClientRect = () => {
            var width = ruler.style.width.replace(/px$/, '');
            width = width ? +width :  // Already includes this.termPadBordLR.
              ruler.innerHTML.length * CharWidth + this.termPadBordLR;
            var maxWidth = ruler.style.maxWidth.replace(/px$/, '');
            var minWidth = ruler.style.minWidth.replace(/px$/, '');
            // Min/max-order: see https://stackoverflow.com/questions/16063771
            if (maxWidth && width > +maxWidth)  width = +maxWidth;
            if (minWidth && width < +minWidth)  width = +minWidth;
            return { width };
          };

          return ruler;
        }
      },

      sync
    });

    // Jump past Term's initial nofade-setTimeout() (<10ms), and past its
    // tempDisablePopup-setTimeout() (200ms).
    if (wait)  clock.tick(wait);
  };



  // --- ENSURING NON-ZERO DIMENSIONS ---

  /**
   * Before each test, we add an HTML-element (supported by the included
   * `jsdom-global` package) that declares some non-zero dimensions in CSS.
   * The added CSS allows us to check the if resulting coordinates are
   * calculated correctly.
   */
  const PadTop    = 2;  // The below CSS settings should result in these..
  const PadRight  = 4;  // ..calculated values, which we will use in tests.
  const PadBottom = 2;
  const PadLeft   = 4;
  const PadLR     = PadLeft + PadRight;
  const TermPadBordLR = 2 + 3 + 3 + 2; // = 10.
  const TermMarginHor = 3 + 3;

  const aaaSW = 3 * CharWidth;          // = Width of a _String_ 'aaa'.
  const aaaTW = aaaSW + TermPadBordLR;  // = Width of a _Term_ containing 'aaa'.

  var el;

  beforeEach(() => {
    el = document.createElement('div');
    el.id = 'xyz';  // This enables cleanup by `afterEach()`.
    el.innerHTML =
      `<style>
        span.ruler { line-height: normal;  white-space: nowrap; }
        .terms { padding: 2px 4px; }
        .term { border: 2px solid #000;  padding: 3px;  margin: 3px;
          line-height: normal;  text-overflow: ellipsis;  white-space: nowrap;
          box-sizing: border-box;  display: inline-block;  overflow: hidden; }
      </style>`;
    document.body.appendChild(el);

  });

  afterEach(() => {
    // We put this in afterEach(), and not at the end of a test that creates a
    // `id="xyz"` HTML-element, so `el` gets cleaned up also after a test fails.
    el = document.getElementById('xyz');
    if (el)  document.body.removeChild(el);
  });



  // --- UTILITY FUNCTIONALITY ---

  const _terms    = () => w.findAll('.terms .term:not(.drag-placeholder)' +
    ':not(.ruler):not(.end)');
  const _termsAll = () => w.findAll('.terms .term:not(.ruler)'); //+endT&dragPlh.
  const _term     = i  => _termsAll().at(i);
  const _label    = i  => _term(i).find('.label');
  const _dragPlh  = () => w.find('.terms .term.drag-placeholder');
  const _endTerm  = () => w.find('.terms .term.end');
  const _popup    = () => w.find('.terms .popup');

  const _termTrig = (i, ...event) => {
    _term(i).trigger(...event);
    clock.tick(10);  // Let any triggered dictionary-lookup responses complete.
  };
  const _termClick     = i => _termTrig(i, 'mousedown.left');
  const _termCClick    = i => _termTrig(i, 'mousedown.left', { ctrlKey: true });
  const _termAClick    = i => _termTrig(i, 'mousedown.left', { altKey: true });
  const _termDblclick  = i => _termTrig(i, 'dblclick.left');
  const _termMEnter    = i => _termTrig(i, 'mouseover');   // Not mouseenter.
  const _termMLeave    = i => _termTrig(i, 'mouseleave');
  const _termClickFull = i => _termTrig(i, 'click.left');  // Not just mousedown.

  const _popupMEnter = () => { _popup().trigger('mouseenter'); clock.tick(10) };
  const _popupMLeave = () => { _popup().trigger('mouseleave'); clock.tick(10) };

  const _termInput = i => _term(i).find('input.input');  // IF it has the input.
  const _termITrig = (i, ...event) => {
    _termInput(i).trigger(...event);
    clock.tick(10);
  };
  const _termITrigTab    = i => _termITrig(i, 'keydown.tab');
  const _termITrigSTab   = i => _termITrig(i, 'keydown.tab', { shiftKey: true });
  const _termITrigBksp   = i => _termITrig(i, 'keydown.backspace');
  const _termITrigEsc    = i => _termITrig(i, 'keydown.esc');
  const _termITrigCDel   = i => _termITrig(i, 'keydown.delete', {ctrlKey: true});
  const _termITrigCEnter = i => _termITrig(i, 'keydown.enter', {ctrlKey: true});
  const _termITrigDown   = i => _termITrig(i, 'keydown.down');
  const _termITrigAUp    = i => _termITrig(i, 'keydown.up',   { altKey: true });
  const _termITrigADown  = i => _termITrig(i, 'keydown.down', { altKey: true });
  const _termITrigEnter  = i => _termITrig(i, 'keydown.enter');
  const _termITrigSEnter = i => _termITrig(i, 'keydown.enter', {shiftKey: true});

  const _ppType = type => w.find('.popup .item.types .type.' + type);

  const _ppItemClick = (name, sub = '') => {
    w.find('.popup .item.' + sub + name).trigger('click.left');
    clock.tick(10);
  };
  const _ppItemTypeClick = name => _ppItemClick(name, 'types .type.');


  // Finds the only <input>, whichever Term it's currently attached to.
  const _input = () => w.find('.terms .term input.input');


  // Changes the content of the input. Argument 1 is optional.
  // + E.g. `_setInput('aa')` changes the input, wherever it currently is.
  //   E.g. `_setInput(2, 'aa')` also implies that it exists at `index` 2.
  const _setInput = (index, newValue) => {
    fixWarnHandler('initialValue');
    if (typeof index == 'string') {  // Is the first argument omitted?
      var input = _input();
      newValue = index;
    }
    else  input = _termInput(index);
    input.element.value = newValue;
    input.trigger('input');
    clock.tick(10);  // Give VsmAutocomplete time to receive data & open list.
  };
  // .
  // .
  // Prevent false warning caused by 'vue-test-utils', saying: 'Avoid mutating
  // a prop directly ... [prop-name]"'. Happens for some _setInput() cases.
  function fixWarnHandler(name) {
    var oldWarnHandler = Vue.config.warnHandler;  // Support multiple fixes.
    Vue.config.warnHandler = (msg, vm, trace) => {
      if (msg.includes(`Prop being mutated: "${name}"`))  return;
      if (oldWarnHandler)  oldWarnHandler(msg, vm, trace);
      else console.log(`${msg}${trace}`);
    };
  }
  afterEach (() => { Vue.config.warnHandler = undefined });  // Reset every time.


  beforeEach(() => {
    // Prevent false warning "Avoid mutating..." warning when using setProps().
    Vue.config.warnHandler = () => {
      if ((new Error().stack).split('\n')
        .some(line => line.startsWith('    at VueWrapper.setProps (')))  return;
    };

    // Prevent this for all tests, as many showed false warning, after we..
    fixWarnHandler('queryOptions');  // ..supported the `queryOptions` prop.
  });


  // Triggers a Click on TheTerms' (padding) itself, not on one of its Terms.
  const _trigClick = (clientX, clientY) => {
    w.trigger('mousedown.left', { clientX, clientY });
    clock.tick(10);
  };


  const _styleValue = (wrap, styleProp) => {
    // Extract e.g. the Number 45 from a style-attribute "width: 45px; .....".
    var re = new RegExp('(^|;)\\s*' + styleProp + ':\\s*(-?\\d+)px\\s*(;|$)');
    var s = wrap.attributes().style.match(re);
    return s === null ? false : +s[2];  // If style-prop. absent, return false.
  };
  const _termStyleValue = (i, styleProp) => _styleValue(_term(i), styleProp);
  const _termHeight = index => _termStyleValue(index, 'height');
  const _termWidth  = index => _termStyleValue(index, 'width');
  const _termXPos   = index => _termStyleValue(index, 'left');
  const _termYPos   = index => _termStyleValue(index, 'top');
  const _totalWidth = () => _styleValue(w, 'width');



  // Support code for the Term-dragging tests.
  const _termMDown    = (i, x, y, cs = undefined) => _termTrig(i,
    'mousedown.left', { ctrlKey: cs, shiftKey: cs,  clientX: x, clientY: y });
  const _termCSMDown  = (i, x, y) => _termMDown(i, x, y, true);
  const _windMTrig    = (name, x, y) =>
    window.dispatchEvent(new MouseEvent(name, { clientX: x, clientY: y }));
  const _windMMove = (x, y) => _windMTrig('mousemove', x, y);
  const _windMUp   = (x, y) => _windMTrig('mouseup',   x, y);
  const _windBlur = () =>  window.dispatchEvent(new CustomEvent('blur'));

  const _termCoos   = index => ({
    x: _termXPos (index),  y: _termYPos  (index),
    w: _termWidth(index),  h: _termHeight(index) });

  const _dragPlhCoos = () => {  // Returns `false` if drag-placeholder is absent.
    var wrap = _dragPlh();
    return !wrap.exists() ? false : ({
      x: _styleValue(wrap, 'left' ),  y: _styleValue(wrap, 'top'   ),
      w: _styleValue(wrap, 'width'),  h: _styleValue(wrap, 'height')
    });
  };

  const _moveCoos = (coos, dx, dy) => ({ // Makes a `coos` with updated x/y only.
    x: coos.x + dx,  y: coos.y + dy,  w: coos.w,  h: coos.h });


  // Prints out all Terms' coordinates, incl endTerm, and any drag-placeholder.
  const DCoos = () => {                    // eslint-disable-line no-unused-vars
    for (var arr = [], i = 0, n = _terms().length;  i < n;  i++) {
      arr.push( { [_term(i).text()] :  _termCoos(i) } );
    }
    arr.push({ '$': _termCoos(n) });  // Add the endTerm.
    if (_dragPlh().exists())  arr.push({ '*': _termCoos(n+1) });  // Drag-placeh.
    D(arr);
  };


  // Ensure to detach listeners that may be added after a mousedown (for drag),..
  afterEach(() => { _windBlur() });       // ..in case the test didn't do so yet.



  // Makes ThePopup appear by *hovering* any Term, and letting the delay pass.
  // + Note: for Edit-Terms, we need to hover a non-Edit-Term first, and then
  //   move over to the Edit-Term. (Note that using DblClick on Edit-Terms
  //   would have the side-effect of cancel/closing vsmAC's matches-list).
  // + THIS FUNCTION REQUIRES that Term 0 is a non-Edit-Term.
  const _showPopupFor = index => {
    if (_term(index).classes().includes('edit')) {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow);
      // Somehow, the following line is needed. (It makes vue-test-utils
      // v1.0.0-beta.26 update data somehow) (and `$forceUpdate` doesn't) :
      _popup().exists().should.equal(true);
      _termMLeave(0);
    }
    _termMEnter(index);
    clock.tick(sizes.delayPopupShow + sizes.delayPopupSwitch);
    w.vm.$forceUpdate();  // <-- Wake up lazy 'vue-test-utils@1.0.0-beta.26'.
  };


  // Triggers the Esc-listener that gets attached to `window` for ThePopup.
  const _windEsc = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  };

  // Ensure to Esc-listener that may still be added.
  afterEach(cb => { _windEsc();  vueTick(cb) });



  // Assertions.
  const _termClsTest = (index, present, absent = []) => {  // Tests assertions.
    _term(index).classes().should.contain('term');
    present.forEach(cls => _term(index).classes().should    .contain(cls));
    absent .forEach(cls => _term(index).classes().should.not.contain(cls));
    return true;
  };
  const _termIsTypeR  = index => _termClsTest(index, ['inst', 'ref']);
  const _termIsTypeI  = index => _termClsTest(index, ['inst'], ['ref']);
  const _termIsTypeC  = index => _termClsTest(index, ['class']);
  const _termIsTypeL  = index => _termClsTest(index, ['lit']);
  const _termIsTypeER = index => _termClsTest(index, ['edit', 'ref']);
  const _termIsTypeEI = index => _termClsTest(index, ['edit'], ['ref', 'class',
    'lit']);
  const _termIsTypeEC = index => _termClsTest(index, ['edit', 'class']);
  const _termIsTypeEL = index => _termClsTest(index, ['edit', 'lit']);

  const _inputHasFocus = (bool = true) =>
    (_input().element === document.activeElement).should.equal(bool);

  const _termHasCssClassInp = i => {  // Only Term at `i` has CSS-class `.inp`.
    _term(i).classes().should.contain('inp');
    w.findAll('.terms .term:not(.ruler).inp').length.should.equal(1);
  };

  const _thereIsFocusedInputAt = index => {  // This function asserts that.
    _termInput(index).exists().should.equal(true);
    _termHasCssClassInp(index);
    _inputHasFocus();
  };

  const _popupShownAt = index => {  // (If -1, popup should *not* be shown).
    var popup = _popup();
    popup.exists().should.equal(index >= 0);
    if (index < 0)  return;
    var popupX = _styleValue(popup, 'left');
    var termIX = _termXPos(index);
    popupX.should.equal(termIX + 0); // <--(Adjust offset if code ever changes).
  };
  const _popupHidden = () => _popupShownAt(-1);


  // See 'Term.test.js' for info on `_emit*()`.
  const _emit = (index = 0, str = '-') => {
    var emit = w.emitted(str);
    return emit !== undefined  &&  emit[index] !== undefined;
  };
  const _emitV = (index = 0, str = '-') =>
    _emit(index, str) ? w.emitted(str)[index][0] : false;


  // Shorthand functions.
  const vueTick = cb => Vue.nextTick(() => { clock.tick(10);  cb() });
  const DE = () => D(w.emittedByOrder());  // eslint-disable-line no-unused-vars




  // --- THE TESTS ---

  describe('initialization', () => {

    it('initializes, when getting only the required props', () => {
      make({ });  // make() gives all & only required props a default value.
      w.isVueInstance().should.equal(true);
    });


    it('gives each Term a different `key` property', () => {
      make({ origTerms: [{ str: 'abc', classID: 'A:01', instID: null }] });
      var key0 = w.vm.terms[0].key;
      var key1 = w.vm.terms[1].key;  // This is the endTerm's key.
      (key0 !== undefined).should.equal(true);
      (key1 !== undefined).should.equal(true);
      (key0 !=  key1     ).should.equal(true);
    });


    it('makes an R-type term have either both not-null or both null ' +
       '`classID` and `parentID`', cb => {
      function testCase(classID, parentID, c, p, cbf) {
        make({ origTerms: [{ str: 'abc', classID, instID: null, parentID }] });
        vueTick(() => {
          _termAClick(0);  // Make the Term focal, just to cause an emit.
          _emitV(0, 'change').should.deep.equal([{ isFocal: true,
            str: 'abc', classID: c, instID: null, parentID: p,  }]);
          cbf();
        });
      }
      testCase(      'A:01', 'id1', 'A:01', 'id1', () =>
        testCase(    'A:01', null , null  , null,  () =>
          testCase(  null  , 'id1', null  , null,  () =>
            testCase(null  , null , null  , null,  cb))));
    });


    it('reads measurements from `.term` and `.terms`\'s CSS', () => {
      make({ origTerms: [
        { str: 'abc', classID: 'A:01', instID: null }
      ]});
      w.vm.padTop       .should.equal(PadTop);
      w.vm.padRight     .should.equal(PadRight);
      w.vm.padBottom    .should.equal(PadBottom);
      w.vm.padLeft      .should.equal(PadLeft);
      w.vm.termPadBordLR.should.equal(TermPadBordLR);
      w.vm.termMarginHor.should.equal(TermMarginHor);
      w.vm.termHeight   .should.equal(TermHeight);
    });


    it('adds the necessary `inst/lit/edit/...` classes to the various ' +
       'Term types', cb => {
      make({
        origTerms: [
          { str: 'lit' },
          { str: 'cls', classID: 'A:01' },
          { str: 'ins', classID: 'A:02',  instID: 'id123' },
          { str: 'ref', classID: 'A:03',  instID: 'id150', parentID: 'id123' },
          { },  // First Edit-type Term (type EI/EC/..) gets the autocomplete.
          { },
          { type: 'ER' },
          { type: 'EC' },
          { type: 'EL' },
          { isFocal: true }
        ],
      });
      vueTick(() => {
        _termIsTypeL (0);
        _termIsTypeC (1);
        _termIsTypeI (2);
        _termIsTypeR (3);
        _termIsTypeEI(4);
        _term        (4).classes().should.contain('inp');
        _termIsTypeEI(5);
        _termIsTypeER(6);
        _termIsTypeEC(7);
        _termIsTypeEL(8);
        _termIsTypeEI(9);
        _term        (9).classes().should.contain('focal');
        _termIsTypeEI(10);
        _term        (10).classes().should.contain('end');
        cb();
      });
    });


    it('moves the `inp`- & sets the `focus`-CSS-class, when moving ' +
       'the input', cb => {
      make({ origTerms: [{ }, { }] });
      vueTick(() => {
        _termIsTypeEI(0);
        _term        (0).classes().should.contain('inp');
        _termIsTypeEI(1);

        _termClick(1);  // Move input to & set focus on 2nd Term.
        vueTick(() => {
          _termIsTypeEI(0);
          _termIsTypeEI(1);
          _term        (1).classes().should.contain('inp');
          _term        (1).classes().should.contain('focus');

          _termClick(0);  // Move input back to the 1st Term.
          vueTick(() => {
            _termIsTypeEI(0);
            _term        (0).classes().should.contain('inp');
            _term        (0).classes().should.contain('focus');
            _termIsTypeEI(1);
            cb();
          });
        });
      });
    });


    it('sets `placeholder` attr. on endTerm, only if there are no real terms; ' +
       'and both so for plain & vsmAC endTerm-input', cb => {
      const _placehold = () => w.find('.placehold');

      // Test 1: sets `placeholder` on a lone, vsmAC-having endTerm.
      make({ origTerms: [], placeholder: 'abx' });
      vueTick(() => {
        _termInput(0).exists().should.equal(true); // endTerm's <input> at pos 0.
        _placehold().text()   .should    .equal  ('abx');
        _placehold().classes().should.not.include('hidden');

        // Test 2: sets `placehol.` on lone, plain-input-having endTerm.
        make({ origTerms: [], placeholder: 'abx' });
        vueTick(() => {
          _termInput  (0).exists().should.equal(true);
          _termCClick (0);  // Change endTerm's type: EI -> EC ..
          _termCClick (0);  // .. -> EL.
          vueTick(() => {
            _termClsTest(0, ['term', 'edit', 'inp', 'lit', 'end']);
            _placehold().text()   .should    .equal  ('abx');
            _placehold().classes().should.not.include('hidden');

            // Test 3: omits `placeholder` on a non-lone endTerm.
            make({ origTerms: [{ str: 'aaa' }], placeholder: 'abx' });
            vueTick(() => {
              _termInput(1).exists().should.equal(true);
              _placehold() .exists().should.equal(false);

              // Test 4: omits `placeh.` on a real (non-endTerm), Edit-type Term.
              make({ origTerms: [{ type: 'EC' }], placeholder: 'abx' });
              vueTick(() => {
                _termInput(0).exists().should.equal(true);
                _placehold() .exists().should.equal(false);
                cb();
              });
            });
          });
        });
      });
    });


    it('makes VsmAutocomplete\'s itemLiteral appear, only when both props ' +
       '`allowClassNull` and `advancedSearch` are `false', cb => {
      function testCase(allowClassNull, advancedSearch, result, cbf) {
        make({ allowClassNull, advancedSearch });
        vueTick(() => {
          _setInput(0, 'a');  // Put smth in the endTerm so autocomplete appears.
          vueTick(() => {
            w.find('.item-type-literal').exists().should.equal(result);
            cbf();
          });
        });
      }

      var advSrch = (data, cb) => cb({ str: data.str, id: null });

      testCase(      false, false,   false, () =>
        testCase(    false, advSrch, true,  () =>
          testCase(  true,  false,   true,  () =>
            testCase(true,  advSrch, true,  cb))));
    });


    it('fills VsmAutocomplete\'s itemLit with custom `customItemLiteral`, or ' +
       'default content based on `allowClassNull` & `advancedSearch`', cb => {
      function testCase(allowClassNull, advancedSearch, custILt, result, cbf) {
        make({ allowClassNull, advancedSearch, customItemLiteral: custILt });
        vueTick(() => {
          _setInput(0, 'aa');
          vueTick(() => {
            var itemLit = w.find('.item-type-literal');
            if (result === null)  itemLit.exists().should.equal(false);
            else {
              itemLit.text().startsWith(result).should.equal(true);

              // Test: it sets a default HTML-title on the item-literal,
              // based on the availability of `advancedSearch`.
              itemLit.attributes().title.toLowerCase().should.include(
                advancedSearch ? 'search' : 'create'
              );
            }
            cbf();
          });
        });
      }

      var advSrch = (data, cb) => cb({ str: data.str, id: null });
      var custILt = data => {
        data.strs.str = `_123_${ data.strs.str }_`;
        return data.strs;
      };
      var aa = ' \'aa\'';

      testCase(              false, false,   false,   null,          () =>
        testCase(            false, false,   custILt, null,          () =>
          testCase(          false, advSrch, false,   'Search' + aa, () =>
            testCase(        false, advSrch, custILt, '_123_aa_',    () =>
              testCase(      true,  false,   false,   'Create' + aa, () =>
                testCase(    true,  false,   custILt, '_123_aa_',    () =>
                  testCase(  true,  advSrch, false,   'Search' + aa, () =>
                    testCase(true,  advSrch, custILt, '_123_aa_',    cb))))))));
    });


    it('lets prop function `custom-term` update Term content, for ' +
       'non-Edit-type Terms only; and gives it all necessary data', cb => {
      var givenTerms = [];
      make({
        origTerms: [
          { str: 'lit', style: 'i', minWidth: 100 },
          { str: 'cls', style: 'i', classID: null },
          { str: 'ins', style: 'i', classID: null, instID: null, isFocal: true },
          { str: 'ref', style: 'i', classID: null, instID: null, parentID: null},
          { },
          { type: 'ER' },
          { type: 'EC' },
          { type: 'EL' }
        ],
        customTerm: function(o) {
          givenTerms.push(o.term);
          // Use/test all of o's properties: str, index, type, term, vsmDict.
          return { str: o.strs.str + o.index + o.type + o.term.style +
            o.vsmDictionary.refTerms.length };
        }
      });

      vueTick(() => {
        _setInput(4, 'ed');  // Give Term 4 some content, which is then turned..
        vueTick(() => {
          _termITrigTab(4);  // ..into a label, by moving the input to Term 5.
          vueTick(() => {
            _label(0).html().includes('<i>lit</i>0Li1').should.equal(true);
            _label(1).html().includes('<i>cls</i>1Ci1').should.equal(true);
            _label(2).html().includes('<i>ins</i>2Ii1').should.equal(true);
            _label(3).html().includes('<i>ref</i>3Ri1').should.equal(true);
            _label(4).html().includes(   'ed'    ).should.equal(true);
            _label(4).html().includes('<i>ed</i>').should.equal(false);
            _label(5).exists().should.equal(false);  // Edit-Term with <input>.
            _label(6).html().includes('<i>'      ).should.equal(false);
            _label(7).html().includes('<i>'      ).should.equal(false);

            //Test that `customTerm()` received cleaned-up Term data.
            givenTerms.should.deep.equal([
              { str: 'lit', style: 'i', minWidth: 100 },
              { str: 'cls', style: 'i', classID: null },
              { str: 'ins', style: 'i', classID: null, instID: null,
                isFocal: true },
              { str: 'ref', style: 'i', classID: null, instID: null,
                parentID: null},
            ]);
            cb();
          });
        });
      });
    });


    it('lets prop function `custom-item` customize Term\'s ' +
       'autocomplete list-items', cb => {
      make({
        origTerms: [{ }],
        customItem: data =>
          Object.assign(data.strs, { descr: data.strs.descr + '___' })
      });
      vueTick(() => {
        _setInput(0, 'a');
        vueTick(() => {
          w.html().includes('ddx___').should.equal(true);
          cb();
        });
      });
    });


    it('lets prop function `custom-popup` customize Term\'s ' +
       'ThePopup\'s info-panel', cb => {
      make({
        origTerms: [{ str: 'abc', classID: 'null' }],
        customPopup: data =>
          Object.assign(data.strs, { str: data.strs.str + '___' })
      });
      vueTick(() => {
        _termMEnter(0);
        vueTick(() => {
          clock.tick(1000);
          vueTick(() => {
            w.html().includes('abc___').should.equal(true);
            cb();
          });
        });
      });
    });


    it('reinitializes correctly after its prop `origTerms` is updated with ' +
       'less Terms than before', cb => {
      make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { str: 'c' }] });
      vueTick(() => {
        _terms().length.should.equal(3);

        w.setProps({ origTerms: [{ str: 'd' }] });
        vueTick(() => {
          _terms().length.should.equal(1);
          _term(0).text().should.equal('d');
          _termInput(1).exists().should.equal(true);  // EndTerm has the input.
          cb();
        });
      });
    });


    it('responds correctly after its prop `sizes` is updated', cb => {
      make({
        sizes: Object.assign({}, sizes, { defaultMaxWidth: 50, minWidth: 200 }),
        origTerms: [{ str: 'aa' }]
      });
      vueTick(() => {
        var termWidth0 = CharWidth * 2 + TermPadBordLR;
        _termWidth(0).should.equal(termWidth0);
        _termWidth(1).should.equal(200 - termWidth0 - TermMarginHor - PadLR);
        _totalWidth().should.equal(200);

        w.setProps({
          sizes: Object.assign({}, sizes, { defaultMaxWidth: 50, minWidth: 500 })
        });
        vueTick(() => {
          _termClick(1);  // Focus the endTerm to trigger a width-recalculation.
          vueTick(() => {
            // Test: Term 0 should not have zero inner stringwidth (which would
            // be caused by a not-reinitialized widthScale);
            // TheTerms is wider; and the endTerm became wider accordingly.
            _termWidth(0).should.equal(termWidth0);
            _termWidth(1).should.equal(500 - termWidth0 - TermMarginHor - PadLR);
            _totalWidth().should.equal(500);
            cb();
          });
        });
      });
    });


    it('updates the Term labels when prop `customTerm` is updated after ' +
       'some delay', cb => {
      make({ origTerms: [{ str: 'aa' }] });
      vueTick(() => {
        _term(0).text().should.equal('aa');
        w.setProps({
          customTerm: o => Object.assign(o.strs, { str: o.index+'.'+o.strs.str })
        });
        vueTick(() => {
          _term(0).text().should.equal('0.aa');
          cb();
        });
      });
    });


    it('emits a \'change-init\' event at start, with cleaned and cloned ' +
       'Term data', cb => {
      // Test 1 also adds an invalid `parentID` (without classID and instID) to
      // show that TheTerms will just ignore it, and exclude it from output.
      // It also excludes internally used term coordinates etc.
      make({ origTerms: [{ str: 'aa', parentID: '123' }] });
      var arr = _emitV(0, 'change-init');
      arr.should.deep.equal([{ str: 'aa' }]);  // It's cleaned data.

      // Test 2: it emitted a clone. Changing it does not affect internal data.
      arr[0].str = 'xy';
      w.vm.terms[0].str.should.equal('aa');

      // Extra test: it does not emit a plain 'change' event at start.
      _emitV(0, 'change').should.equal(false);
      cb();
    });


    it('emits a \'change\' event after changing prop `sizes', cb => {
      make({ origTerms: [{ str: 'aa' }] });
      _emitV(0, 'change').should.equal(false);

      w.setProps({ sizes: { minWidth: 1243 } });
      vueTick(() => {
        _emitV(0, 'change').should.not.equal(false);
        _emitV(1, 'change').should    .equal(false);

        w.setProps({
          customTerm: o => Object.assign(o.strs, { str: o.index+'.'+o.strs.str })
        });
        vueTick(() => {
          _emitV(1, 'change').should.not.equal(false);
          cb();
        });
      });
    });
  });



  describe('Terms\' dimensions and positioning', () => {

    it('can calculate Term widths', () => {
      make({ origTerms: [
        { str: 'abc', classID: 'A:01', instID: null }
      ]});
      w.vm.termWidth(''   ).should.equal(TermPadBordLR);
      w.vm.termWidth('a'  ).should.equal(TermPadBordLR + 1 * CharWidth);
      w.vm.termWidth('aaa').should.equal(TermPadBordLR + 3 * CharWidth);
      w.vm.termWidth('aaa',     50         ).should.equal(TermPadBordLR + 50);
      w.vm.termWidth('abcdefg', 20, 30     ).should.equal(TermPadBordLR + 30);
      w.vm.termWidth('abcdefg', 20, 30, 100).should.equal(TermPadBordLR + 100);
    });


    it('applies `minWidth` and `maxWidth`, to non-Edit type Terms', cb => {
      make({ origTerms: [
        { str: 'aaa', classID: 'A:01', instID: null, parentID:null}, // Type 'R'.
        { str: 'aaa', classID: 'A:01', instID: null },               // Type 'I'.
        { str: 'aaa', classID: 'A:01' },                             // Type 'C'.
        { str: 'aaa' },                                              // Type 'L'.
        { str: 'aaa', minWidth: aaaSW + 6 },                         // 'L'.
        { str: 'aaa', maxWidth: aaaSW - 6 },                         // 'L'.
        { str: 'aaa', minWidth: aaaSW + 6, maxWidth: aaaSW - 6 }     // 'L'.
      ]});
      vueTick(() => {
        _terms().length.should.equal(7);
        ///D(_term(0).attributes().style);  D(_termHeight(0));  D(_termWidth(0));

        // All Terms are equally high.
        Array(7).fill().forEach((e,i) => _termHeight(i).should.equal(TermHeight));

        // Note that each Term only gets a style="width:...px" set to it; not
        // any 'min/max-width' style-attribute parts. (The latter are only used
        // temp-ly on the .ruler element, to calculate each Term's final width).
        _termWidth(0).should.equal(aaaTW);
        _termWidth(1).should.equal(aaaTW);
        _termWidth(2).should.equal(aaaTW);
        _termWidth(3).should.equal(aaaTW);
        _termWidth(4).should.equal(aaaTW + 6);
        _termWidth(5).should.equal(aaaTW - 6);
        _termWidth(6).should.equal(aaaTW + 6); // (CSS spec.: min overrides max).
        cb();
      });
    });


    it('applies `default/editWidth` only, to Edit-type Terms, only', cb => {
      var editSW = 50;
      make({ origTerms: [
        // Type 'L':
        { str: 'aaa', editWidth: editSW                      },
        { str: 'aaa', editWidth: editSW, minWidth: aaaSW + 7 },
        { str: 'aaa', editWidth: editSW, maxWidth: aaaSW - 7 },
        // Type 'E*' (EI/EC/EL):
        { },               // This will use `sizes.defaultEditWidth`.
        { minWidth: 20 },  // This too. It ignores `minWidth`.
        { editWidth: editSW                       },
        { editWidth: editSW, minWidth: aaaSW *10, type: 'EC' }, // Test with..
        { editWidth: editSW, maxWidth: aaaSW *10, type: 'EL' }  // ..all 3 types.
      ]});
      vueTick(() => {
        _termWidth(0).should.equal(aaaTW);
        _termWidth(1).should.equal(aaaTW + 7);
        _termWidth(2).should.equal(aaaTW - 7);
        _termWidth(3).should.equal(sizes.defaultEditWidth + TermPadBordLR);
        _termWidth(4).should.equal(sizes.defaultEditWidth + TermPadBordLR);
        _termWidth(5).should.equal(editSW + TermPadBordLR);
        _termWidth(6).should.equal(editSW + TermPadBordLR);
        _termWidth(7).should.equal(editSW + TermPadBordLR);
        cb();
      });
    });


    it('applies `sizes.defaultMaxWidth` to a Term if is has no `maxWidth` ' +
       'property', cb => {
      make({
        origTerms: [
          { str: 'aaaaa'               },  // `sizes.defaultMaxWidth` is applied.
          { str: 'aaaaa', maxWidth: 15 },  // Its `maxWidth` property is applied.
          { str: 'aaaaa', maxWidth:  0 }   // No `maxWidth` is applied.
        ],
        sizes: { defaultMaxWidth: 20 }
      });
      vueTick(() => {
        _termWidth(0).should.equal(20            + TermPadBordLR);
        _termWidth(1).should.equal(15            + TermPadBordLR);
        _termWidth(2).should.equal(CharWidth * 5 + TermPadBordLR);
        cb();
      });
    });


    it('discards `sizes.defaultMaxWidth` if it is 0', cb => {
      make({
        origTerms: [
          { str: 'aaaaa'               },  // No `maxWidth` is applied.
          { str: 'aaaaa', maxWidth: 15 },  // Its `maxWidth` property is applied.
          { str: 'aaaaa', maxWidth:  0 }   // No `maxWidth` is applied.
        ],
        sizes: { defaultMaxWidth: 0 }
      });
      vueTick(() => {
        _termWidth(0).should.equal(CharWidth * 5 + TermPadBordLR);
        _termWidth(1).should.equal(15            + TermPadBordLR);
        _termWidth(2).should.equal(CharWidth * 5 + TermPadBordLR);
        cb();
      });
    });


    it('applies `sizes.widthScale` to all string-width constraints ' +
       '(min/max/editWidth, default..Width, minEndTerm..Width)', cb => {
      make({
        origTerms: [
          { str: 'aaaaa'               }, // `sizes.defaultMaxWidth` is applied.
          { str: 'aaaaa', maxWidth:  6 }, // Its `maxWidth` property is applied.
          { str: 'a'    , minWidth: 99 }, // Its `minWidth` property is applied.
          {                            }, // `sizes.defaultEditWidth` is applied.
          {              editWidth: 50 }, // Its `editWidth` property is applied.
        ],
        sizes: {
          defaultMaxWidth: 5,
          defaultEditWidth: 30,
          minEndTermWidth: 88.888, // -> Also test that the result is an Integer.
          minEndTermWideWidth: 90, // Tiny bit wider, to test the widening code.
          widthScale: 2
        }
      });
      vueTick(() => {
        _termWidth(0).should.equal(2 *  5 + TermPadBordLR);
        _termWidth(1).should.equal(2 *  6 + TermPadBordLR);
        _termWidth(2).should.equal(2 * 99 + TermPadBordLR);
        _termWidth(3).should.equal(2 * 30 + TermPadBordLR);
        _termWidth(4).should.equal(2 * 50 + TermPadBordLR);
        _termWidth(5).should.equal(2 * 89 + TermPadBordLR);  // The endTerm.

        _termClick(5);  // Puts the input on the endTerm, and focuses it.
        vueTick(() => {
          _termWidth(5).should.equal(2 * 90 + TermPadBordLR);
          cb();
        });
      });
    });


    it('absolute-positions Terms at the right coordinates', cb => {
      make({ origTerms: [
        { str: 'aaa' },
        { str: 'aaa', minWidth: 50 },
        { editWidth: 90 },
        { str: 'aaa' }
      ]});
      vueTick(() => {
        ///D(_termYPos(0));
        ///D(_termXPos(0)); D(_termXPos(1)); D(_termXPos(2)); D(_termXPos(3));

        // All Terms are placed at the same Y-coordinate.
        Array(4).fill().forEach((e, i) => _termYPos(i).should.equal(PadTop));

        _termWidth(0).should.equal(aaaTW);  // (Just to doublecheck).
        _termWidth(1).should.equal(50 + TermPadBordLR);
        _termWidth(2).should.equal(90 + TermPadBordLR);
        _termWidth(3).should.equal(aaaTW);

        // All Terms are placed in a row, with a margin in between.
        _termXPos(0).should.equal(PadLeft);
        _termXPos(1).should.equal(_termXPos(0) + _termWidth(0) + TermMarginHor);
        _termXPos(2).should.equal(_termXPos(1) + _termWidth(1) + TermMarginHor);
        _termXPos(3).should.equal(_termXPos(2) + _termWidth(2) + TermMarginHor);
        cb();
      });
    });


    it('updates content & coordinates, after a change in prop ' +
       '`origTerms`', cb => {
      make({ origTerms: [{ str: 'aaa' }] });
      vueTick(() => {
        _terms().length.should.equal(1);
        _term(0).text().should.equal('aaa');

        w.setProps({ origTerms: [{ str: '12345' }, { str: 'ccc' }] });
        vueTick(() => {
          _terms().length.should.equal(2);

          _term(0).text().should.equal('12345');
          _termXPos (0).should.equal(PadLeft);
          _termWidth(0).should.equal(CharWidth * 5 + TermPadBordLR);

          _term(1).text().should.equal('ccc');
          _termXPos(1).should.equal(_termXPos(0) + _termWidth(0) + TermMarginHor);
          _termWidth(1).should.equal(CharWidth * 3 + TermPadBordLR);
          cb();
        });
      });
    });
  });



  describe('endTerm\'s dimensions', () => {

    it('makes EndTerm\'s width fill an empty TheTerms', cb => {
      make({ origTerms: [] });
      vueTick(() => {
        _terms   ().length.should.equal(0);  // No normal Terms,..
        _termsAll().length.should.equal(1);  // .. only an endTerm.

        _term(0)  .exists().should.equal(true);  // } Two ways to access endTerm.
        _endTerm().exists().should.equal(true);  // }
        _endTerm().text().should.equal('');
        _termWidth(0).should.equal(sizes.minWidth - PadLeft - PadRight);
        cb();
      });
    });


    it('makes EndTerm\'s width fill the rest of a near-empty TheTerms', cb => {
      make({ origTerms: [{ str: 'aaa' }, { str: 'aaa' }] });
      vueTick(() => {
        _terms   ().length.should.equal(2);   // All normal Terms.
        _termsAll().length.should.equal(3);   // All normal Terms + the endTerm.
        _term(2)   .text().should.equal('');  // The endTerm.
        _termWidth(2).should.equal(sizes.minWidth - PadLeft - PadRight - aaaTW*2
          - TermMarginHor * 2);  // Margin: between Term 0 & 1, and 1 & endTerm.
        cb();
      });
    });


    it('makes EndTerm a bit narrower when a Term becomes a bit wider, ' +
       'in a near-empty TheTerms', cb => {
      make({
        origTerms: [{ str: 'aaa' }, { str: 'aaa' }],
        sizes: { minWidth: 500, minEndTermWidth: 10 }
      });
      vueTick(() => {
        var x = 500 - PadLeft - PadRight - aaaTW *2 - TermMarginHor *2;
        _termWidth(2).should.equal(x);

        // Add two chars to the 2nd Term. Then, because the TermEnd uses much
        // more than its minimum required width, the TermEnd will shrink a bit.
        w.setProps({ origTerms: [{ str: 'aaa' }, { str: 'aaaBB' }] });
        vueTick(() => {
          _termWidth(2).should.equal(x - CharWidth *2);
          cb();
        });
      });
    });


    it('gives EndTerm its `minEndTermWidth` in a narrow TheTerms', cb => {
      make({
        origTerms: [{ str: 'aaa' }, { str: 'aaa' }],
        sizes: { minWidth: 10, minEndTermWidth: 1000, minEndTermWideWidth: 5000 }
      });
      vueTick(() => {
        _termWidth(2).should.equal(1000 + TermPadBordLR);
        cb();
      });
    });


    it('gives a focused EndTerm its `minEndTermWideWidth`, ' +
       'in a narrow TheTerms; and does not shrink when unfocusing ', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes: { minWidth: 10, minEndTermWidth: 1000, minEndTermWideWidth: 5000 }
      });
      vueTick(() => {

        _termITrig(1, 'focus');
        vueTick(() => {  // This gives it a chance to focus the endTerm.
          _termWidth(1).should.equal(5000 + TermPadBordLR);

          _termITrig(1, 'blur');  // Blur the endTerm.
          vueTick(() => {
            _termWidth(1).should.equal(5000 + TermPadBordLR);  // Didn't shrink.
            cb();
          });
        });
      });
    });



    it('gives an EndTerm its `minEndTermWideWidth`, when focus moves to it ' +
       'from another term, and keeps this width when focus moves away', cb => {
      make({
        origTerms: [{ str: 'aaa' }, { }],
        sizes: { minWidth: 10, minEndTermWidth: 1000, minEndTermWideWidth: 5000 }
      });
      vueTick(() => {  // At creation time, the second Term gets the input.
        _term(1).classes().should.contain('inp');
        _termWidth(2).should.equal(1000 + TermPadBordLR);

        _termClick(2);  // Now move focus to the endTerm, and focus it.
        vueTick(() => {
          _term(2).classes().should.contain('inp');
          _termWidth(2).should.equal(5000 + TermPadBordLR);

          _termClick(1);  // Move focus back to the second Term.
          vueTick(() => {
            _term(1).classes().should.contain('inp');
            _termInput(2).exists().should.equal(false);
            _termWidth(2).should.equal(5000 + TermPadBordLR); // Width unchanged.
            cb();
          });
        });
      });
    });


    it(['when Dblclick=start-editing a real Term makes it a bit wider:',
      'it shrinks a not-narrow endTerm accordingly, and does not widen TheTerms;',
      'then when Esc=cancel-edit restores it & focuses real Edit-term behind it:',
      'endTerm widens again to its original width']
      .join('\n        '),
    cb => {
      make({
        origTerms: [{ str: 'aaa', classID: 'A:01' }, { }],
        sizes: {
          minWidth: 500, // This will make endTerm much wider than its min width.
          defaultEditWidth: 50,
          minEndTermWidth: 100, minEndTermWideWidth: 200
        }
      });
      vueTick(() => {
        const wAaa  = 3 * CharWidth + TermPadBordLR;
        const wEdit = 50 + TermPadBordLR;
        const wPadd = PadLeft + PadRight + TermMarginHor * 2;
        const wTotal = _termWidth(0) + _termWidth(1) + _termWidth(2) + wPadd;
        (wAaa < wEdit).should.equal(true);  // (Sanity check for this test).

        const testTotalWidth = () => {
          (_termWidth(0) + _termWidth(1) + _termWidth(2) + wPadd)
            .should.equal(wTotal);  // Sum of TheTerms parts. Should add up OK.
          _totalWidth().should.equal(wTotal);  // Width of TheTerms.
        };

        _termWidth(0).should.equal(wAaa);
        _termWidth(1).should.equal(wEdit);
        _termWidth(2).should.equal(500 - wPadd - wAaa - wEdit);  // Fills to 500.
        testTotalWidth();

        _termDblclick(0);
        vueTick(() => {
          _termWidth(0).should.equal(wEdit);
          _termWidth(1).should.equal(wEdit);
          _termWidth(2).should.equal(500 - wPadd - wEdit * 2);  // Shrank a bit.
          testTotalWidth();

          _termITrigEsc(0);  // Close the autocomplete list.
          _termITrigEsc(0);  // Press Esc on a closed list.
          vueTick(() => {
            _termInput(1).exists().should.equal(true);
            _inputHasFocus();
            _termWidth(0).should.equal(wAaa);
            _termWidth(1).should.equal(wEdit);
            _termWidth(2).should.equal(500 - wPadd - wAaa - wEdit); // Grew some.
            testTotalWidth();
            cb();
          });
        });
      });
    });
  });



  describe('TheTerms\' own dimensions', () => {

    it('sets style.width (`sizes.minWidth`) and style.height on itself ' +
       'when empty', cb => {
      make({ origTerms: [] });
      vueTick(() => {
        _styleValue(w, 'height').should.equal(PadTop + TermHeight + PadBottom);
        _styleValue(w, 'width' ).should.equal(sizes.minWidth);
        w.emitted('width')[0][0].should.equal(sizes.minWidth);  // +emits it too.
        cb();
      });
    });


    it('sets correct style.width on itself, when content exceeds ' +
       '`minWidth`', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes:     { minWidth: 5, minEndTermWidth: 10 }
      });
      vueTick(() => {
        _styleValue(w, 'height').should.equal(PadTop + TermHeight + PadBottom);

        var x = PadLeft + aaaTW + TermMarginHor + 10 + TermPadBordLR + PadRight;
        _styleValue(w, 'width' ).should.equal(x);
        w.emitted('width')[0][0].should.equal(x);
        cb();
      });
    });


    it('updates its style.width when a Term becomes wider, when ' +
       'content exceeds `sizes.minWidth`; and emits `width`', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes:     { minWidth: 5, minEndTermWidth: 10 }
      });
      vueTick(() => {
        var widthOrig = _totalWidth();
        w.emitted('width')[0][0].should.equal(widthOrig); // 1st emit, 1st arg.

        w.setProps({ origTerms: [{ str: 'aaaBB' }] });  // Widen Term 2 by chars.
        vueTick(() => {
          var widthNew = widthOrig + CharWidth * 2;
          _styleValue(w, 'width' ).should.equal(widthNew);
          w.emitted('width')[1][0].should.equal(widthNew); // 2nd emit,1st arg.
          cb();
        });
      });
    });


    it('does not update its style.width when a Term becomes wider, when content ' +
       'does not exceed `sizes.minWidth`; and does not emit new `width`', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes:     { minWidth: 500, minEndTermWidth: 10 }
      });
      vueTick(() => {
        _styleValue(w, 'width' ).should.equal(500);
        w.emitted('width')[0][0].should.equal(500);  // First emit.

        w.setProps({ origTerms: [{ str: 'aaaBB' }] });
        vueTick(() => {
          _totalWidth().should.equal(500);
          expect(w.emitted('width')[1]).to.equal(undefined);  // No 2nd emit.
          cb();
        });
      });
    });


    it('does not lose width if a Term shrinks, even if width exceeds ' +
       '`sizes.minWidth`', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes:     { minWidth: 5, minEndTermWidth: 10 }
      });
      vueTick(() => {
        var widthOrig = _totalWidth();
        w.emitted('width')[0][0].should.equal(widthOrig);  // First emit.

        w.setProps({ origTerms: [{ str: 'a' }] }); // Make Term 2 chars narrower.
        vueTick(() => {
          _totalWidth().should.equal(widthOrig);  // TheTerms' width stays same.
          expect(w.emitted('width')[1]).to.equal(undefined);  // No 2nd emit.
          cb();
        });
      });
    });
  });



  describe('prop/state-based placement of VsmAutocomplete / plain input', () => {

    it('adds a VsmAutocomplete component to the endTerm of an empty ' +
       'VsmBox', cb => {
      make({ });  // This TheTerms component will only contain an endTerm.
      vueTick(() => {
        _term(0).classes().should.contain('inp');
        _term(0).find('.vsm-autocomplete').exists().should.equal(true);
        cb();
      });
    });


    it('initially adds the VsmAutocomplete to the first Edit-type Term', cb => {
      make({ origTerms: [{ str: 'aaa' }, { }, { }] });
      vueTick(() => {
        _term  (0).find('.vsm-autocomplete').exists().should.equal(false);
        _term  (1).find('.vsm-autocomplete').exists().should.equal(true);
        _term  (2).find('.vsm-autocomplete').exists().should.equal(false);
        _endTerm().find('.vsm-autocomplete').exists().should.equal(false);
        cb();
      });
    });


    it('only if `autofocus` prop is set: it adds a `autofocus`-attr to the ' +
       'first Edit-Term\'s input', cb => {

      // Subtest 1: with autofocus.
      make({ origTerms: [{ str: 'aaa' }, { }, { }], autofocus: true });
      vueTick(() => {
        _input().attributes().autofocus.should.not.equal(undefined);

        // Subtest 2: without autofocus.
        make({ origTerms: [{ str: 'aaa' }, { }, { }] });
        vueTick(() => {
          expect(_input().attributes().autofocus).to.equal(undefined);
          cb();
        });
      });
    });


    it('repositions VsmAutocomplete on `origTerms` prop change', cb => {
      make({ origTerms: [{ }, { str: 'aaa' }, { }] });
      vueTick(() => {
        _term(0).find('.vsm-autocomplete').exists().should.equal(true);

        w.setProps({ origTerms: [{ str: 'aaa' }, { str: 'aaa' }, { }] });
        vueTick(() => {
          _term  (0).find('.vsm-autocomplete').exists().should.equal(false);
          _term  (1).find('.vsm-autocomplete').exists().should.equal(false);
          _term  (2).find('.vsm-autocomplete').exists().should.equal(true);
          _endTerm().find('.vsm-autocomplete').exists().should.equal(false);
          cb();
        });
      });
    });


    it('adds VsmAutocomplete to the end-Term, if there are only ' +
       'non-Edit-type Terms', cb => {
      make({ origTerms: [{ str: 'aaa' }, { str: 'aaa' }, { str: 'aaa' }] });
      vueTick(() => {
        _term  (0).find('.vsm-autocomplete').exists().should.equal(false);
        _term  (1).find('.vsm-autocomplete').exists().should.equal(false);
        _term  (2).find('.vsm-autocomplete').exists().should.equal(false);
        _endTerm().find('.vsm-autocomplete').exists().should.equal(true);
        cb();
      });
    });


    it('initially adds just a plain <input> to the first Edit-type Term, ' +
       'if it is an Edit-Literal-type Term', cb => {
      make({ origTerms: [{ str: 'aaa' }, { type: 'EL' }, { }] });
      vueTick(() => {
        _term(1).find('.vsm-autocomplete').exists().should.equal(false);
        _term(1).find('input.input'      ).exists().should.equal(true );
        _term(1).classes().should.contain('inp');
        cb();
      });
    });


    it('switches from VsmAutocomplete to an <input> for some `origTerms` ' +
       ' change', cb => {
      make({ origTerms: [{ }, { str: 'aaa' }, { }] });
      vueTick(() => {
        _term(0).classes().should.contain('inp');
        _term(0).find('.vsm-autocomplete').exists().should.equal(true);

        w.setProps(
          { origTerms: [{ str: 'aaa' }, { str: 'aaa' }, { type: 'ER' }] });
        vueTick(() => {
          _term(0).find('.vsm-autocomplete').exists().should.equal(false);
          _term(2).find('.vsm-autocomplete').exists().should.equal(false);
          _term(2).find('input.input'      ).exists().should.equal(true);
          _term(2).classes().should.contain('inp');
          cb();
        });
      });
    });


    it('has only one <input> even if it has multiple Edit-type Terms', cb => {
      make({ origTerms: [
        { }, { type: 'EC' }, { type: 'EL' }, { type: 'ER' }
      ]});
      vueTick(() => {
        w.findAll('.terms .term .input').length.should.equal(1);
        cb();
      });
    });


    it('moves a VsmAutocomplete or plain <input> from one Editable Term to ' +
      'another one, and switches Editable-Term type as needed', cb => {
      make({ origTerms: [
        { }, { type: 'EC' }, { type: 'EL' }, { type: 'ER' }
      ]});

      function hasExpectedInputAt (index, isTypeAC) {
        w.findAll('.terms .term .input').length.should.equal(1); // Only 1 input.
        _termInput(index).exists().should.equal(true);  // Is where we expect it.
        _term(index).find('.vsm-autocomplete').exists()
          .should.equal(isTypeAC); // It's either an autocomplete or plain input.
      }

      // Initially the input is at a Term of type EI. And it's a VsmAutocomplete.
      vueTick(() => {
        hasExpectedInputAt(0, true);

        // Switch from EI, to Term of type EC.
        _termClick(1);
        vueTick(() => {
          hasExpectedInputAt(1, true);

          // Switch from EC, to Term of type EL. No vsmAC, just a plain input.
          _termClick(2);
          vueTick(() => {
            hasExpectedInputAt(2, false);

            // Switch from EL, to Term of type ER.
            _termClick(3);
            vueTick(() => {
              hasExpectedInputAt(3, false);

              // Switch from ER, back to Term of type EI.
              _termClick(1);
              vueTick(() => {
                hasExpectedInputAt(1, true);
                cb();
              });
            });
          });
        });
      });
    });
  });



  describe('user-interaction: changing input location', () => {

    it('lets Tab/Shift+Tab move the input forward/backward between ' +
       'Edit-type Terms, cyclingly', cb => {
      make({ origTerms: [
        //0,   1,              2,             3,               4,           [5].
        { }, { str: 'aaa' }, { type: 'EC' }, { type: 'EL' }, { type: 'ER' }
      ]});
      vueTick(() => {
        _termInput(0).exists().should.equal(true);
        _termITrigTab(0);  // (This asserts the line above too).

        _termInput(0).exists().should.equal(false); // Input moved away, skipped..
        _termInput(2).exists().should.equal(true);  // ..over 1 to Term 2.
        _termITrigTab(2);

        _termInput(3).exists().should.equal(true);
        _termITrigTab(3);

        _termInput(4).exists().should.equal(true);
        _termITrigTab(4);

        _termInput(5).exists().should.equal(true);  // Now we're at the endTerm.
        _termITrigTab(5);

        _termInput(0).exists().should.equal(true);  // Cycled back to Term 0.
        _termITrigTab(0);

        _termInput(2).exists().should.equal(true);
        _termITrigSTab(2);

        _termInput(0).exists().should.equal(true);  // We Shift+Tab'ed back to 0.
        _termITrigSTab(0);

        _termInput(5).exists().should.equal(true); // Cycled back to endTerm (5).
        _termITrigSTab(5);

        _termInput(4).exists().should.equal(true);
        cb();
      });
    });


    it('keeps an Edit-type Term\'s input value as its label when the input ' +
       'moves away, and restores it when the input comes back', cb => {
      make({ origTerms: [{ }, { type: 'EL' }] });
      vueTick(() => {
        _setInput(0, 'aa');
        _termITrigTab(0);
        vueTick(() => {
          _term(0).text().should.equal('aa'); // Remains as a vsmAC-Term's label.

          _setInput(1, 'BB');
          _termITrigSTab(1);
          vueTick(() => {
            _term(1).text().should.equal('BB');  // Remains also for plain input.

            _termInput(0).element.value.should.equal('aa'); // Restored in input.
            _termITrigTab(0);
            vueTick(() => {
              _termInput(1).element.value.should.equal('BB');  // And here too.
              cb();
            });
          });
        });
      });
    });


    it('lets a Mousedown on an Edit-type Term (only) give it the input, ' +
       'and also backs-up/restores input values', cb => {
      make({ origTerms: [{ }, { type: 'EL' }, { str: 'aaa' }] });
      vueTick(() => {
        _setInput(0, 'aa');
        _termClick(1);                              // Click on 2nd Term.
        vueTick(() => {
          _termInput(1).exists().should.equal(true);  // Input moved to 2nd Term.
          _term(0).text().should.equal('aa');  // Also backed up Term 0's input.

          _setInput(1, 'BB');
          _termClick(0);
          vueTick(() => {
            _termInput(0).exists().should.equal(true);
            _term(1).text().should.equal('BB');

            _termInput(0).element.value.should.equal('aa'); // Restored in input.
            _termClick(1);
            vueTick(() => {
              _termInput(1).exists().should.equal(true);
              _termInput(1).element.value.should.equal('BB'); // And here too.

              _termClick(2);  // Click on non-Edit Term.
              vueTick(() => {
                _termInput(2).exists().should.equal(false);
                _termInput(1).exists().should.equal(true);

                _termClick(3);  // Click on endTerm.
                vueTick(() => {
                  _termInput(3).exists().should.equal(true);
                  cb();
                });
              });
            });
          });
        });
      });
    });


    it('focuses endTerm, after a Click on the TheTerms\'s padding (and only) ' +
       'to the right of endTerm\'s left margin', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _termInput(1).exists().should.equal(false);

        // Test 1: a click left of the endTerm has no effect, but refocus input.
        var startX = w.vm.$el.offsetLeft + _termXPos(1) - TermMarginHor;
        _trigClick(startX - 5, 0);
        vueTick(() => {
          _termInput(0).exists().should.equal(true);
          _inputHasFocus();
          _termInput(1).exists().should.equal(false);

          // Test 2: a click right of (or at) the endTerm-left-margin has effect.
          _trigClick(startX + 1, 0);
          vueTick(() => {
            _termInput(1).exists().should.equal(true);
            _inputHasFocus();
            cb();
          });
        });
      });
    });


    it('focuses endTerm, after a Click anywhere on the TheTerms\'s ' +
       'padding, if there are no real Terms', cb => {
      make({ origTerms: [] });
      vueTick(() => {
        _inputHasFocus(false);

        _trigClick(w.vm.$el.offsetLeft);
        vueTick(() => {
          _inputHasFocus();
          cb();
        });
      });
    });


    it('does not focus endTerm, after Click on non-Edit Term, or on other ' +
       'Edit-term of either vsmAC or plain type', cb => {
      var nope = () => _termInput(3).exists().should.equal(false);
      make({ origTerms: [{ str: 'aaa' }, { }, { type: 'EL' }] });
      vueTick(() => {
        nope();
        _termClick(0);                    nope();
        _termClick(1);                    nope();
        _termITrig(1, 'mousedown.left');  nope();

        _termClick(2);  // Move input to EL-type Term.
        _termITrig(2, 'mousedown.left');  nope();

        _termClick(3);
        _termInput(3).exists().should.equal(true);  // Sanity check.
        cb();
      });
    });


    it('removes endTerm\'s `focus` CSS-class after a Click on ' +
       'another Term', cb => {
      make({ origTerms: [{ str: 'aaa' }, { }] });
      vueTick(() => {
        _term(2).classes().should.not.contain('focus');

        // Part 1: focus endTerm, click Edit-Term.
        _termClick(2);
        vueTick(() => {
          _term(2).classes().should    .contain('focus');  // endTerm got it.
          _termClick(1);
          _term(2).classes().should.not.contain('focus');  // endTerm lost it.

          // Part 2: focus endTerm, click non-Edit-Term.
          _termClick(2);
          _term(2).classes().should    .contain('focus');  // endTerm got it.

          // Our test-framework doesn't fire realistic events for a click on
          // the first Term, so we have to do it manually.
          _termClick(0);
          _termTrig (0, 'focus');
          _termITrig(2, 'blur');

          _term(2).classes().should.not.contain('focus');  // endTerm lost it.
          cb();
        });
      });
    });
  });



  describe('user-interaction: Ctrl+Mousedown changes Term-type, and ' +
     'emits `change` + new terms array', () => {

    it('L-type changes to R, and the emitted term includes properties ' +
       '`class/inst/parentID==null` (even if `allowClassNull==false`)', cb => {
      // Note: `allowClassNull` only pertains to I- and C-type Terms.
      make({ origTerms: [{ str: 'aaa' }], allowClassNull: false });
      vueTick(() => {
        ///_term(0).classes().should.contain('term');
        ///_term(0).classes().should.contain('lit');
        _termIsTypeL(0);  // =shorthand for the two lines above.

        ///_term(0).trigger('mousedown.left', {ctrlKey: true});  clock.tick(10);
        _termCClick(0);  // =shorthand for the line above.

        _termIsTypeR(0);
        _emitV(0, 'change').should.deep.equal(  // Emits (list of 1) R-type Term.
          [{ str: 'aaa', classID: null, instID: null, parentID: null }]);
        cb();
      });
    });


    it('R-type with `classID==null` skips types I / C, and changes to L, ' +
       'if prop `allowClassNull==false`', cb => {
      make({
        origTerms: [{ str: 'aa', classID: null, instID: null, parentID: null }],
        allowClassNull: false
      });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick(0);
        _termIsTypeL(0);
        _emitV(0, 'change').should.deep.equal([{ str: 'aa' }]);
        cb();
      });
    });


    it('R-type with `classID!=null` changes to I, ' +
       'if `allowClassNull==false`', cb => {
      make({
        origTerms: [{ str: 'a', classID: 'A:01', instID: null, parentID: 'i5' }],
        allowClassNull: false
      });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick(0);
        _termIsTypeI(0);
        _emitV(0, 'change').should.deep.equal(
          [{ str: 'a', classID: 'A:01', instID: null }]);
        cb();
      });
    });


    it('R-type with `classID==null` changes to I, ' +
       'if `allowClassNull==true`', cb => {
      make({
        origTerms: [{ str: 'aa', classID: null, instID: null, parentID: null }],
        allowClassNull: true
      });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick(0);
        _termIsTypeI(0);
        _emitV(0, 'change').should.deep.equal(
          [{ str: 'aa', classID: null, instID: null }]);
        cb();
      });
    });


    it('invalid I-type with `classID==null` under `allowClassNull==false` ' +
       'skips type C, and changes to L', cb => {
      make({
        origTerms: [{ str: 'aa', classID: null, instID: null }],
        allowClassNull: false
      });
      vueTick(() => {
        _termIsTypeI(0);
        _termCClick(0);
        _termIsTypeL(0);
        _emitV(0, 'change').should.deep.equal([{ str: 'aa' }]);
        cb();
      });
    });


    it('valid I-type with `classID!=null` or `allowClassNull!=false` ' +
       'changes to C', cb => {
      function testCase(classID, allowClassNull, cbf) {
        make({origTerms: [{ str:'aa', classID, instID:null }], allowClassNull});
        vueTick(() => {
          _termIsTypeI(0);
          _termCClick(0);
          _termIsTypeC(0);
          _emitV(0, 'change').should.deep.equal([{ str: 'aa', classID }]);
          cbf();
        });
      }
      testCase(    null, true,  () =>
        testCase(  'id', false, () =>
          testCase('id', true,  cb)));
    });


    it('ER-type changes to EI if `allowClassNull==false` ', cb => {
      make({ origTerms: [{ type: 'ER' }], allowClassNull: false });
      vueTick(() => {
        _termIsTypeER(0);
        _termCClick  (0);
        _termIsTypeEI(0);
        _emitV(0, 'change').should.deep.equal([{ }]);
        cb();
      });
    });


    it('non-Edit-type cycles through the 4 Term-types: I->C->L->R->I (incl. ' +
       'L->R, as it remembers `classID`)', cb => {
      var instTerm = {
        str: 'aaa', classID: 'A:01', instID: 'id01',
        dictID: 'A:01', descr: 'xy'  // Extra test: only R/I/C-Terms emit these.
      };
      make({ origTerms: [instTerm] });
      vueTick(() => {
        _termIsTypeI(0);

        _termCClick(0);
        _termIsTypeC(0);
        _emitV(0, 'change').should.deep.equal([{
          str: 'aaa', classID: 'A:01',
          dictID: 'A:01', descr: 'xy'
        }]);

        _termCClick(0);
        _termIsTypeL(0);
        _emitV(1, 'change').should.deep.equal([
          { str: 'aaa' }]);

        _termCClick(0);
        _termIsTypeR(0);
        _emitV(2, 'change').should.deep.equal([
          // Note: parentID==null, so classID is reported as null too.
          { str: 'aaa', classID: null,
            instID: 'id01', parentID: null, dictID: 'A:01', descr: 'xy' }]);

        _termCClick(0);
        _termIsTypeI(0);
        _emitV(3, 'change').should.deep.equal([instTerm]);  // cls/instID: back.
        cb();
      });
    });


    it('Edit-type cycles: EI->EC->EL->ER->EI; and keeps input content', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _termIsTypeEI(0);

        _setInput(0, 'aa');
        _termCClick(0);
        vueTick(() => {  // We test "keeps input content" after a `nextTick()`.
          _termIsTypeEC(0);
          _input().element.value.should.equal('aa');
          _emitV(0, 'change').should.deep.equal([{ type: 'EC' }]);

          _setInput(0, 'bb');
          _termCClick(0);
          vueTick(() => {
            _termIsTypeEL(0);
            _input().element.value.should.equal('bb');
            _emitV(1, 'change').should.deep.equal([{ type: 'EL' }]);

            _setInput(0, 'cc'); // Makes change before switch: vsmAC -> plain.
            _termCClick(0);
            vueTick(() => {
              _termIsTypeER(0);
              _input().element.value.should.equal('cc');
              _emitV(2, 'change').should.deep.equal([{ type: 'ER' }]);

              _setInput(0, 'dd');
              _termCClick(0);
              vueTick(() => {
                _termIsTypeEI(0);
                _input().element.value.should.equal('dd');
                _emitV(3, 'change').should.deep.equal([{ }]);  // Implicit..
                cb();                                          // ..type 'EI'.
              });
            });
          });
        });
      });
    });


    it('Ctrl+Mousedown on unfocused Edit-Term, moves & focuses input ' +
       'there', cb => {
      make({ origTerms: [{ }, { }] });
      vueTick(() => {
        _termInput(0).exists().should.equal(true);
        _termInput(1).exists().should.equal(false);

        _termCClick(1);
        vueTick(() => {
          _termInput (0).exists().should.equal(false);
          _termInput (1).exists().should.equal(true);
          _inputHasFocus();
          _termIsTypeEC(1);
          _emitV(0, 'change').should.deep.equal([{ }, { type: 'EC' }]);
          cb();
        });
      });
    });


    const rTerm = {
      str: 'aaa', classID: 'A:01', instID: 'id22', parentID: 'id11' };

    it('emits after R->I, and excludes `parentID` & internally used ' +
       'Term properties', cb => {  // (This was part of an earlier test already).
      make({ origTerms: [rTerm] });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick (0);
        _termIsTypeI(0);
        _emitV(0, 'change').should.deep.equal([
          { str: 'aaa', classID: 'A:01', instID: 'id22' }]);
        cb();
      });
    });


    it('emits after R->I->C, and excludes `parent/instID`', cb => {
      make({ origTerms: [rTerm] });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick (0);  _termCClick (0);
        _termIsTypeC(0);
        _emitV(1, 'change').should.deep.equal([{ str: 'aaa', classID: 'A:01' }]);
        cb();
      });
    });


    it('emits after R->I->C->L, and excludes `parent/inst/classID`', cb => {
      make({ origTerms: [rTerm] });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick (0);  _termCClick (0);  _termCClick (0);
        _termIsTypeL(0);
        _emitV(2, 'change').should.deep.equal([{ str: 'aaa' }]);
        cb();
      });
    });


    it('emits after R->I->C->L->R, and keeps all IDs', cb => {
      make({ origTerms: [rTerm] });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick (0);  _termCClick (0);  _termCClick (0);  _termCClick (0);
        _termIsTypeR(0);
        _emitV(3, 'change').should.deep.equal([rTerm]);
        cb();
      });
    });


    it('emits after ER->EI/EC/EL/ER, and includes only `type`, ' +
       'and none for EI', cb => {  // (This was part of an earlier test already).
      make({ origTerms: [{ type: 'ER' }] });
      vueTick(() => {
        _termIsTypeER(0);
        _setInput('ab');

        _termCClick  (0);
        _termIsTypeEI(0);
        _emitV(0, 'change').should.deep.equal([{ }]);

        _termCClick  (0);
        _termIsTypeEC(0);
        _emitV(1, 'change').should.deep.equal([{ type: 'EC' }]);

        _termCClick  (0);
        _termIsTypeEL(0);
        _emitV(2, 'change').should.deep.equal([{ type: 'EL' }]);

        _termCClick  (0);
        _termIsTypeER(0);
        _emitV(3, 'change').should.deep.equal([{ type: 'ER' }]);
        cb();
      });
    });


    it('changes the type of the endTerm, and does not emit', cb => {
      make({ origTerms: [] });  // There is only an endTerm here.
      vueTick(() => {
        _term(0).classes().should.not.contain('class');
        _termCClick(0);
        _term(0).classes().should    .contain('class');
        _emit(0, 'change').should.equal(false);
        cb();
      });
    });


    it('for an R-term with parentID==null: emits classID as null too', cb => {
      make({ origTerms: [
        { str: 'aaa', classID: 'A:01', instID: 'id22' }] });
      vueTick(() => {
        // Cycle Term-type: I->C->L->R->I, and verify that in the R-type emit,
        // emits, the classID is made null.
        _termCClick(0);
        _termCClick(0);
        _termCClick(0);
        _termCClick(0);
        _emitV(0, 'change').should.deep.equal([{ str: 'aaa', classID: 'A:01' }]);
        _emitV(1, 'change').should.deep.equal([{ str: 'aaa'}]);
        _emitV(2, 'change').should.deep.equal([{ str: 'aaa', classID: null,
          instID: 'id22', parentID: null }]);  // It made classID null,..
        _emitV(3, 'change').should.deep.equal([{ str: 'aaa', classID: 'A:01',
          instID: 'id22' }]);                  // ..but it can still restore it.
        cb();
      });
    });
  });



  describe('user-interaction: Alt+Mousedown sets focal Term, and ' +
     'emits `change` + array', () => {

    it('sets focal state on a Term', cb => {
      make({ origTerms: [{ str: 'aa' }] });
      vueTick(() => {
        _term(0).classes().should.not.contain('focal');

        _termAClick(0);
        _term(0).classes().should.contain('focal');
        _emitV(0, 'change').should.deep.equal([{ str: 'aa', isFocal: true }]);
        cb();
      });
    });


    it('moves focal state to a new Term', cb => {
      make({ origTerms: [{ str: 'aa', isFocal: true }, { str: 'bb' }] });
      vueTick(() => {
        _term(0).classes().should.    contain('focal');
        _term(1).classes().should.not.contain('focal');

        _termAClick(1);
        _term(0).classes().should.not.contain('focal');
        _term(1).classes().should    .contain('focal');
        _emitV(0, 'change').should.deep.equal(
          [{ str: 'aa' }, { str: 'bb', isFocal: true }]);
        cb();
      });
    });


    it('unsets focal state of a focal Term, leaving no Term focal', cb => {
      make({ origTerms: [{ str: 'aa', isFocal: true }, { str: 'bb' }] });
      vueTick(() => {
        _termAClick(0);
        _term(0).classes().should.not.contain('focal');
        _term(1).classes().should.not.contain('focal');
        _emitV(0, 'change').should.deep.equal([{ str: 'aa' }, { str: 'bb'}]);
        cb();
      });
    });


    it('sets/unsets focal state of an Edit-type Term', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _term(0).classes().should.not.contain('focal');

        _termAClick(0);
        _term(0).classes().should    .contain('focal');
        _emitV(0, 'change').should.deep.equal([{ isFocal: true }]);

        _termAClick(0);
        _term(0).classes().should.not.contain('focal');
        _emitV(1, 'change').should.deep.equal([{ }]);
        cb();
      });
    });


    it('sets/unsets focal state of an Edit-type Term, for Alt+Mousedown ' +
       'on the input element (both plain and vsmAC)', cb => {
      make({ origTerms: [{ }, { type: 'EL' }] });
      vueTick(() => {
        _termITrig(0, 'mousedown.left', { altKey: true });
        _term(0).classes().should    .contain('focal');
        _emitV(0, 'change').should.deep.equal([{ isFocal: true }, {type: 'EL'}]);

        _termITrig(0, 'mousedown.left', { altKey: true });
        _term(0).classes().should.not.contain('focal');
        _emitV(1, 'change').should.deep.equal([{ }, { type: 'EL' }]);

        _termClick(1);  // Move the input to 2nd Term.
        _termITrig(1, 'mousedown.left', { altKey: true });
        _term(1).classes().should    .contain('focal');
        _emitV(2, 'change').should.deep.equal([{ }, {type: 'EL', isFocal: true}]);

        _termITrig(1, 'mousedown.left', { altKey: true });
        _term(1).classes().should.not.contain('focal');
        _emitV(3, 'change').should.deep.equal([{ }, { type: 'EL' }]);
        cb();
      });
    });


    it('moves focal state to a new Edit-type Term, moves & focuses input ' +
       'there, and keeps original Term\'s input content', cb => {
      make({ origTerms: [{ isFocal: true }, { }] });
      vueTick(() => {
        _term(0).classes().should.    contain('focal');
        _term(1).classes().should.not.contain('focal');

        _setInput('ab');
        _termAClick(1);
        vueTick(() => {  // This gives it a chance to move the focus to 2nd Term.
          _term(0).classes().should.not.contain('focal');
          _term(1).classes().should    .contain('focal');
          _inputHasFocus();
          _term(0).text().should.equal('ab');  // Backed-up input.
          _emitV(0, 'change').should.deep.equal([{ }, { isFocal: true }]);

          _setInput('xy');
          _termAClick(0);  // Alt+Click back on 1st Term.
          vueTick(() => {
            _term(0).classes().should    .contain('focal');
            _term(1).classes().should.not.contain('focal');
            _inputHasFocus();
            _termInput(0).element.value.should.equal('ab');  // Restored input.
            _term     (1).text()       .should.equal('xy');  // Backed-up input.
            _emitV(1, 'change').should.deep.equal([{ isFocal: true }, { }]);
            cb();
          });
        });
      });
    });


    it('does not set(/move) focal state on(/to) the endTerm, but ' +
       'still moves & focuses input there', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _term(1).classes().should.not.contain('focal');  // endTerm at pos. 1.

        _termAClick(1);
        vueTick(() => {  // This lets it move the focus.
          _term(1).classes().should.not.contain('focal');
          _termInput(1).exists().should.equal(true);
          _inputHasFocus();
          _emit(0, 'change').should.equal(false);
          cb();
        });
      });
    });
  });



  describe('user-interaction: Doubleclick starts to edit a Term; Esc cancels ' +
     'and restores the Term; both emit `change` + array', () => {

    function testDblclickEsc(term, editTerm, hasAutocomplete, cb) {
      make({ origTerms: [term] });
      vueTick(() => {

        _termDblclick(0);
        vueTick(() => {
          _emitV(0, 'change').should.deep.equal([editTerm]);

          // One Escape-press for plain inputs,
          // two Escape-presses for vsmAC-input (1st Esc closes autocompl-list).
          _termITrigEsc(0);
          if (hasAutocomplete)  _termITrigEsc(0);

          vueTick(() => {
            _emitV(1, 'change').should.deep.equal([term]);
            cb();
          });
        });
      });
    }

    var extra = { dictID: 'A:01', descr: 'xy' };


    it('makes-editable and restores R-type Term: R -> ER -> R', cb => {
      testDblclickEsc(
        { str: 'aaa', style: 'i', classID: null, instID: null, parentID: null },
        { type: 'ER' },  // Note: no `style` here.
        false,
        cb);
    });


    it('makes-editable and restores I-type Term: I -> EI -> I', cb => {
      testDblclickEsc(
        { str: 'aaa', style: 'i', classID: 'A:01', instID: null, ...extra },
        { }, true, cb);
    });


    it('makes-editable and restores C-type Term: C -> EC -> C', cb => {
      testDblclickEsc(
        { str: 'aaa', style: 'i', classID: 'A:01', ...extra },
        { type: 'EC' }, true, cb);
    });


    it('makes-editable and restores L-type Term: L -> EL -> L', cb => {
      testDblclickEsc({ str: 'aaa', style: 'i' }, { type: 'EL' }, false, cb);
    });


    it('restores the Term also after changing the Edit-Term\'s type: ' +
       'I->EI->EC->I', cb => {
      var term =
        { str: 'aaa', style: 'i', classID: 'A:01', instID: null, ...extra };
      make({ origTerms: [term] });
      vueTick(() => {
        _termIsTypeI(0);

        _termDblclick(0);
        vueTick(() => {
          _termIsTypeEI(0);
          _emitV(0, 'change').should.deep.equal([{ }]);

          _termCClick(0);
          vueTick(() => {
            _termIsTypeEC(0);
            _emitV(1, 'change').should.deep.equal([{ type: 'EC' }]);

            _termITrigEsc(0);  // Close autocomplete-list.
            _termITrigEsc(0);  // Trigger vsmAC's `key-esc`.
            vueTick(() => {
              _termIsTypeI(0);
              _emitV(2, 'change').should.deep.equal([term]);
              cb();
            });
          });
        });
      });
    });


    it('Dblclick places the Term\'s `str` in its acquired input, & ' +
       'focuses it', cb => {
      make({ origTerms: [
        { str: 'aa' },
        { str: 'bb', classID: 'A01' }
      ] });
      vueTick(() => {

        _termDblclick(0);
        vueTick(() => {
          _termInput(0).element.value.should.equal('aa');  // In a plain input.
          _inputHasFocus();

          _termDblclick(1);
          vueTick(() => {
            _termInput(1).element.value.should.equal('bb');  // In a vsmAC-input.
            _inputHasFocus();
            cb();
          });
        });
      });
    });


    it('on Dblclick, some update-causing operations, and Esc: restores ' +
       'the original `str`, `style`, and `label`', cb => {
      make({ origTerms: [{ str: 'aaa', style: 'i2', classID: 'A:01' }, { }] });
      vueTick(() => {
        _term(0).html().should.include('>aa<i>a</i><');
        _termDblclick(0);           // Make first Term Editable.
        vueTick(() => {
          _setInput(0, 'bbbb');     // Change <input> content.
          vueTick(() => {
            _termClick(1);          // Move to second Edit-Term.
            vueTick(() => {
              _term(0).html().should.include('>bbbb<');
              _termITrigCEnter(1);  // Make new Term after 2nd one (=>re-inits).
              vueTick(() => {
                _termClick(0);      // Move back to first Edit-Term.
                vueTick(() => {
                  _termITrigEsc(0); // Close autocomplete.
                  _termITrigEsc(0); // Restore original term.
                  vueTick(() => {
                    _term(0).html().should.include('>aa<i>a</i><');
                    cb();
                  });
                });
              });
            });
          });
        });
      });
    });


    it('Esc after Dblclick moves the input to the next Edit-Term & ' +
       'focuses it', cb => {
      make({ origTerms: [{ str: 'aa' }, { }] });
      vueTick(() => {

        _termDblclick(0);
        vueTick(() => {
          _termIsTypeEL(0);

          _termITrigEsc(0);
          vueTick(() => {
            _termIsTypeL(0);

            _termIsTypeEI(1);
            _termInput(1).exists().should.equal(true);
            _inputHasFocus();
            cb();
          });
        });
      });
    });


    it('Esc has no effect on an Edit-Term that was never non-Edit type', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {

        // Part 1: test it on a real Edit-type Term.
        _termITrigEsc(0);
        vueTick(() => {
          _termIsTypeEI(0);
          _termInput(0).exists().should.equal(true);
          _emitV(0, 'change').should.equal(false);

          // Part 2: test it on the endTerm.
          _termClick(1);  // First move the input there.
          vueTick(() => {
            _termITrigEsc(1);
            vueTick(() => {
              _termIsTypeEI(1);
              _termInput(1).exists().should.equal(true);
              _emitV(0, 'change').should.equal(false);
              cb();
            });
          });
        });
      });
    });


    it('Dblclick applies `editWidth`: makes a narrow term wider; and then ' +
       'Esc narrows it', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes: { defaultEditWidth: 100 }
      });
      vueTick(() => {
        var wAaa  = 3 * CharWidth + TermPadBordLR;
        var wEdit = 100 + TermPadBordLR;
        _termWidth(0).should.equal(wAaa);

        _termDblclick(0);
        vueTick(() => {
          _termWidth(0).should.equal(wEdit);

          _termITrigEsc(0);
          vueTick(() => {
            _termWidth(0).should.equal(wAaa);
            cb();
          });
        });
      });
    });


    it('after Dblclick&Esc widens & then narrows a Term: does not shrink ' +
       'TheTerms, and widens endTerm to fill the extra space', cb => {
      make({
        origTerms: [{ str: 'aaa' }],
        sizes: {
          minWidth: 2,  // This makes endTerm have `minEndTermWidth` initially.
          defaultEditWidth: 50,
          minEndTermWidth: 100,  minEndTermWideWidth: 100,
          widthScale: 9.5  // Extra challenging test! : use a non-1 `widthScale`.
        }
      });
      vueTick(() => {

        const wAaa  = 3 * CharWidth + TermPadBordLR;
        const wEdit = 9.5 * 50  + TermPadBordLR;
        const wEnd1 = 9.5 * 100 + TermPadBordLR;
        const wEnd2 = wEnd1 + wEdit - wAaa;  // Bit wider endTerm.
        const wTotal1 = PadLeft + wAaa  + TermMarginHor + wEnd1 + PadRight;
        const wTotal2 = PadLeft + wEdit + TermMarginHor + wEnd1 + PadRight;

        (wAaa < wEdit).should.equal(true);  // (Sanity check).
        _termWidth(0).should.equal(wAaa);
        _termWidth(1).should.equal(wEnd1);
        _totalWidth().should.equal(wTotal1);

        _termDblclick(0);
        vueTick(() => {
          _termWidth(0).should.equal(wEdit);   // Wider.
          _termWidth(1).should.equal(wEnd1);   // Unchanged.
          _totalWidth().should.equal(wTotal2); // Wider due to Term0.

          _termITrigEsc(0);
          vueTick(() => {
            _termWidth(0).should.equal(wAaa);     // Back to original.
            _termWidth(1).should.equal(wEnd2);    // Wider: compensates, so..
            _totalWidth().should.equal(wTotal2);  // ..TheTerms doesn't shrink.
            wTotal2 > 0;
            cb();
          });
        });
      });
    });
  });



  describe('user-interaction: varia', () => {

    it('does not emit `change` when typing in an Edit-type ' +
       'Term', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _setInput('abc');
        vueTick(() => {
          _emit(0, 'change').should.equal(false);
          cb();
        });
      });
    });


    it('plain-input content remains after simple blur event', cb => {
      make({ origTerms: [{ type: 'EL' }] });
      vueTick(() => {
        _termITrig(0, 'focus');
        _setInput('aa');
        vueTick(() => {

          // On blur, Vue updates CSS-classes, and may refresh input content..
          _termITrig(0, 'blur'); // ..too, so the code must secure against that.
          vueTick(() => {
            _input().element.value.should.equal('aa');
            cb();
          });
        });
      });
    });


    it('vsmAC-input content remains after simple blur event', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _termITrig(0, 'focus');
        _setInput('aa');
        vueTick(() => {

          // On blur, Vue updates CSS-classes, and may refresh input content..
          _termITrig(0, 'blur'); // ..too, so the code must secure against that.
          vueTick(() => {
            _input().element.value.should.equal('aa');
            cb();
          });
        });
      });
    });


    it('Backspace on vsmAC-input with 2 trailing spaces does not remove all ' +
       'spaces; and on Tab to next Term, keeps them in the label', cb => {
      // Note: this tests that 'Term.vue' listens to vsmAC's 'input' event,
      //       instead of the 'input-change' event which trims the input-string.
      make({ origTerms: [{ }, { }] });
      vueTick(() => {
        _setInput('a  ');
        vueTick(() => {
          _termITrigBksp(0);
          vueTick(() => {
            _input().element.value.should.not.equal('a');

            _setInput('a  ');
            _termITrigTab(0);
            vueTick(() => {
              _term(0).html().should.include('>a  <');  // (Note: .text() trims).
              cb();
            });
          });
        });
      });
    });


    it('Dblclick I-Term: EI-Term input gets styling-free, customization-free, ' +
       'sanitized text; and gets it as label when focus other Edit-Term', cb => {
      make({
        origTerms: [{ str: 'aa<script ', style: 'i', classID: 'A:01' }, { }],
        customTerm: o => Object.assign(o.strs, { str: '_' + o.strs.str + '_' })
      });
      vueTick(() => {
        _label(0).element.innerHTML.should.equal('_<i>aa&lt;script </i>_');

        _termDblclick(0);
        vueTick(() => {    // The exact `str` is placed in the <input>, ..
          _termInput(0).element.value.should.equal('aa<script ');

          _termClick(1);
          vueTick(() => {  // ..but is sanitized when shown via an HTML-label.
            _label(0).element.innerHTML.should.equal('aa&lt;script ');
            cb();
          });
        });
      });
    });


    it('Dblclick I-Term, edit content, focus other Edit-Term: then label is ' +
       'still sanitized text', cb => {
      make({
        origTerms: [{ str: 'aa<script ', style: 'i', classID: 'A:01' }, { }],
        customTerm: o => Object.assign(o.strs, { str: '_' + o.strs.str + '_' })
      });
      vueTick(() => {
        _termDblclick(0);
        vueTick(() => {
          _setInput(0, 'bb<script ');
          _termClick(1);
          vueTick(() => {
            _label(0).element.innerHTML.should.equal('bb&lt;script ');
            cb();
          });
        });
      });
    });


    it('Dblclick non-Edit-Term, changing it, and focus other Edit-Term: ' +
       'keeps the changed content in the first one', cb => {
      make({ origTerms: [{ str: 'aa', classID: 'A:01' }, { }] });
      vueTick(() => {
        _termDblclick(0);
        vueTick(() => {
          _setInput(0, 'bb');
          vueTick(() => {
            _termClick(1);
            vueTick(() => {
              _term(0).text().should.equal('bb');
              cb();
            });
          });
        });
      });
    });
  });



  describe('user-interaction: Bksp/Ctrl+Del/Ctrl+Enter on empty Edit-Term ' +
     'edits-prev / deletes current / inserts Edit-Term; emits `change`', () => {

    it('Backspace on a non-empty EI-type Edit-Term: has no effect', cb => {
      make({ origTerms: [{ str: 'aaa' }, { }] });
      vueTick(() => {
        _setInput(1, 'bbb');  // Type smth in the vsmAC-enabled (2nd) Term.
        vueTick(() => {
          _termITrigBksp(1);
          vueTick(() => {
            _termIsTypeL (0);  // } No change.
            _termIsTypeEI(1);  // }
            _terms().length.should.equal(2);  // Nr. of Terms, excluding endTerm.
            _emit(0, 'change').should.equal(false);
            cb();
          });
        });
      });
    });


    it('Backspace on a non-empty EL-type Edit-Term: has no effect', cb => {
      make({ origTerms: [{ str: 'aaa' }, { type: 'EL' }] });
      vueTick(() => {
        _setInput(1, 'bbb');  // Type smth in the plain-input (2nd) Term
        vueTick(() => {
          _termITrigBksp(1);
          vueTick(() => {
            _termIsTypeL (0);
            _termIsTypeEL(1);
            _terms().length.should.equal(2);
            _emit(0, 'change').should.equal(false);
            cb();
          });
        });
      });
    });


    it('Backspace on an empty first Edit-Term: has no effect, and ' +
       'emits nothing', cb => {
      make({ origTerms: [{ }, { str: 'aaa' }] });
      vueTick(() => {

        _termITrigBksp(0);
        vueTick(() => {
          _termIsTypeEI(0);
          _termIsTypeL(1);
          _terms().length.should.equal(2);  // No change.
          _emit(0, 'change').should.equal(false);
          cb();
        });
      });
    });


    it('Backspace on empty Term having an Edit-Term before it: moves ' +
       'input & focus there, and emits no change', cb => {
      make({ origTerms: [{ }, { }] });
      vueTick(() => {
        _termClick(1);
        vueTick(() => {
          _termITrigBksp(1);
          vueTick(() => {
            _thereIsFocusedInputAt(0);
            _termIsTypeEI(0);
            _termIsTypeEI(1);
            _terms().length.should.equal(2);
            _emit(0, 'change').should.equal(false);
            cb();
          });
        });
      });
    });


    it('Backspace on empty Term having a non-Edit Term before it: makes it ' +
       'editable, moves input&focus there, and emits `change`+array', cb => {
      make({ origTerms: [{ str: 'aaa' }, { }] });
      vueTick(() => {
        _termITrigBksp(1);
        vueTick(() => {
          _thereIsFocusedInputAt(0);
          _termInput(0).element.value.should.equal('aaa');
          _termIsTypeEL(0);
          _termIsTypeEI(1);
          _terms().length.should.equal(2);
          _emitV(0, 'change').should.deep.equal([{ type: 'EL' }, { }]);
          cb();
        });
      });
    });


    it('Backspace on endTerm: reuses part of its wide-width when giving the ' +
       'Term before it its required edit-width', cb => {
      make({
        origTerms: [{ str: 'aaa', editWidth: 100 }],
        sizes: { minEndTermWidth: 10, minEndTermWideWidth: 400 }
      });
      const wAaa   = 3 * CharWidth + TermPadBordLR;
      const wEnd   = 400 + TermPadBordLR;
      const wTotal = PadLeft + wAaa + TermMarginHor + wEnd + PadRight;
      vueTick(() => {
        _termClick(1);
        _termWidth(0).should.equal(wAaa);
        _termWidth(1).should.equal(wEnd);
        _totalWidth().should.equal(wTotal);

        _termITrigBksp(1);
        vueTick(() => {
          _thereIsFocusedInputAt(0);
          const wAaa2 = 100 + TermPadBordLR;
          const wEnd2 = wEnd - (wAaa2 - wAaa);  // After endTerm loses focus,..
          // ..Term 0 repurposes some of that space for its own wider editWidth.
          _termWidth(0).should.equal(wAaa2);
          _termWidth(1).should.equal(wEnd2);
          _totalWidth().should.equal(wTotal);
          _emitV(0, 'change').should.deep.equal([{ type: 'EL', editWidth: 100}]);
          cb();
        });
      });
    });


    it('Backspace on Term #2, making Term #1 before it editable, followed ' +
       'by Esc on #1: restores #1', cb => {
      make({ origTerms: [{ str: 'aaa' }, { }] });
      vueTick(() => {
        _termITrigBksp(1);
        vueTick(() => {
          _thereIsFocusedInputAt(0);
          _emitV(0, 'change').should.deep.equal([{ type: 'EL' }, { }]);

          _setInput(0, 'Q');
          vueTick(() => {
            _termITrigEsc(0);
            vueTick(() => {
              _thereIsFocusedInputAt(1);
              _emitV(1, 'change').should.deep.equal([{ str: 'aaa' }, { }]);
              cb();
            });
          });
        });
      });
    });


    it('Ctrl+Del on EI-type endTerm: has no effect', cb => {
      make({ origTerms: [{ str: 'aaa' }] });
      vueTick(() => {
        _termClick(1);
        vueTick(() => {
          _thereIsFocusedInputAt(1);
          _termITrigCDel(1);
          vueTick(() => {
            _thereIsFocusedInputAt(1);
            _term(0).text().should.equal('aaa');
            _termIsTypeL (0);
            _termIsTypeEI(1);  // The endTerm.
            _terms().length.should.equal(1);
            _emit(0, 'change').should.equal(false);
            cb();
          });
        });
      });
    });


    it('Ctrl+Del on non-EI-type endTerm: resets its type to EI, focuses it, ' +
       'and does not emit any change', cb => {
      function testCase(clicks, cbf) {
        make({ origTerms: [{ str: 'aaa' }] });
        vueTick(() => {
          _termClick(1);
          vueTick(() => {
            _thereIsFocusedInputAt(1);
            const typeCheck = [_termIsTypeEC, _termIsTypeEL, _termIsTypeER];
            for (var i = 0; i < clicks; i++) {
              _termCClick(1);  // Change endTerm type.
              typeCheck[i](1);
            }

            _termITrigCDel(1);
            vueTick(() => {
              _thereIsFocusedInputAt(1);
              _term(0).text().should.equal('aaa');
              _termIsTypeL (0);
              _termIsTypeEI(1);  // The endTerm reverted to type EI
              _terms().length.should.equal(1);
              _emit(1, 'change').should.equal(false);
              cbf();
            });
          });
        });
      }
      testCase(    1, () =>
        testCase(  2, () =>
          testCase(3, cb)));
    });


    it('Ctrl+Del on wide endTerm in empty VsmBox: resets its width to ' +
       'the VsmBox\'s `minWidth`', cb => {
      make({
        origTerms: [{ str: 'a', editWidth: 500 }],
        sizes: { minWidth: 100, minEndTermWidth: 20, minEndTermWideWidth: 50 }
      });
      vueTick(() => {
        _termClick(1);
        _termITrigBksp(1);  // Backspace into Term 0. This makes it very wide.
        vueTick(() => {
          _termWidth(0).should.equal(500 + TermPadBordLR);

          _termITrigCDel(0);  // Delete Term 0. This makes endTerm very wide.
          vueTick(() => {
            _terms().length.should.equal(0);  // Only the endTerm remains.
            (_termWidth(0) > 500).should.equal(true);

            _termITrigCDel(0);  // Press Ctrl+Delete in the endTerm.
            vueTick(() => {
              _termWidth(0).should.equal(100 - PadLR);
              cb();
            });
          });
        });
      });
    });


    it('Ctrl+Del on wide endTerm in sufficiently full VsmBox: resets its ' +
       'width to `minEndTermWideWidth`', cb => {
      make({
        origTerms: [
          { str: 'a', minWidth: 500 },  // Wide Term 0, beyond VsmBox's minWidth.
          { str: 'a', editWidth: 500 }  // After edit&delete, makes endTerm wide.
        ],
        sizes: { minWidth: 100, minEndTermWidth: 20, minEndTermWideWidth: 50 }
      });
      vueTick(() => {
        _termClick(2);
        _termITrigBksp(2);  // Backspace into Term 1. This makes it very wide.
        vueTick(() => {
          _termITrigCDel(1);  // Delete Term 1. This makes endTerm very wide.
          vueTick(() => {
            _terms().length.should.equal(1);  // Only Term 0 and endTerm remain.
            (_termWidth(1) > 500).should.equal(true);

            _termITrigCDel(1);  // Press Ctrl+Delete in the endTerm.
            vueTick(() => {
              _termWidth(1).should.equal(50 + TermPadBordLR);
              cb();
            });
          });
        });
      });
    });


    it('Ctrl+Del on non-/empty Term: deletes it, moves input&focus to Edit-' +
       'Term behind/before/further-behind it, and emits `change`+array', cb => {
      function testCase(arr, from, to, str, cbf) {
        make({ origTerms: arr });
        vueTick(() => {
          _termClick(from);
          vueTick(() => {
            _thereIsFocusedInputAt(from);
            if (str)  _setInput(from, str);
            vueTick(() => {

              _termITrigCDel(from);
              vueTick(() => {
                _thereIsFocusedInputAt(to);

                arr.splice(from, 1);
                _terms().length.should.equal(arr.length);
                _emitV(0, 'change').should.deep.equal(arr);
                cbf();
              });
            });
          });
        });
      }
      testCase(          [{ }, { }, { str: 'aaa' }], 1, 0, '',  () =>
        testCase(        [{ }, { }, { str: 'aaa' }], 1, 0, 'a', () =>
          testCase(      [{ str: 'aaa' }, { }, { }], 1, 1, '',  () =>
            testCase(    [{ str: 'aaa' }, { }, { }], 1, 1, 'a', () =>
              testCase(  [{ }, { str: 'aaa' }, { }], 0, 1, '',  () =>
                testCase([{ }, { str: 'aaa' }, { }], 0, 1, 'a', cb))))));
    });


    it('Ctrl+Del on a non-empty Edit-Term does not move its content to ' +
       'the next Term', cb => {
      // This tests that a removed Term which has the focus, does not emit
      // further events (invalid events which the code would respond to).
      // + Note: apparently, this test does not fail here, but would fail in the
      //   browser, if the code would fail to blur the input before detaching it.
      //   But we keep the test here anyway.
      function testCase(type, cbf) {
        make({ origTerms: [ type == 'EI' ? { } : { type },  { str: 'aaa' }] });
        vueTick(() => {
          _termClick(0);  // Focus the first Term.
          vueTick(() => {
            _thereIsFocusedInputAt(0);
            _setInput(0, 'QQQ');
            vueTick(() => {
              var el = _termInput(0).element;
              el.selectionStart = el.selectionEnd = 2;
              vueTick(() => {
                _termITrigCDel(0);
                vueTick(() => {
                  _terms().length.should.equal(1);
                  _thereIsFocusedInputAt(1);  // The endTerm has focus.
                  _term(0).text().should.equal('aaa');  // This wasn't affected.
                  cbf();
                });
              });
            });
          });
        });
      }
      testCase(      'ER', () =>
        testCase(    'EI', () =>
          testCase(  'EC', () =>
            testCase('EL', cb))));
    });


    it('Ctrl+Enter on an Edit-Term inserts a new Edit-Instance Term ' +
       'after the current one, moves focus to it, and emits `change`', cb => {
      make({ origTerms: [{ }, { type: 'EL' }] });
      vueTick(() => {

        // Trigger Ctrl+Enter in the vsmAC-enabled (1st) Term.
        _termITrigCEnter(0);
        vueTick(() => {
          _terms().length.should.equal(3);  // One term appeared.
          _thereIsFocusedInputAt(1);  // We moved 1 position to the right.
          _emitV(0, 'change').should.deep.equal([{ }, { }, { type: 'EL' }]);

          // Trigger Ctrl+Enter in the plain-input (now 3rd) Term.
          _termITrigTab(1);  // First, move to that third Edit-Term.
          _termITrigCEnter(2);
          vueTick(() => {
            _terms().length.should.equal(4);  // Another term appeared.
            _thereIsFocusedInputAt(3);        // One more position to the left.
            _emitV(1, 'change').should.deep.equal(  // This tests it was added..
              [{ }, { }, { type: 'EL' }, { }]);     // ..behind the orig. Term.
            cb();
          });
        });
      });
    });


    it('Ctrl+Enter on the endTerm also moves endTerm-status to the ' +
       'new Term', cb => {
      make({ origTerms: [{ }, { }] });
      vueTick(() => {
        _termCClick(2);  // Change endTerm's type to 'EC'.
        _termITrigCEnter(2);
        vueTick(() => {
          _termsAll().length.should.equal(4);  // 4 Terms, including the endTerm.
          _thereIsFocusedInputAt(3);
          _emitV(0, 'change').should.deep.equal(
            [{ }, { }, { type: 'EC' }]);  // It generated a new, real EC-Term.

          _term(2).classes().should.not.contain('end');
          _term(3).classes().should    .contain('end');
          cb();
        });
      });
    });


    it('updates the former endTerm\'s width after adding a new endTerm ' +
       'behind it', cb => {
      make({
        origTerms: [],  // There is only the endTerm here.
        sizes: {
          minWidth: 2,  // Avoid interference with endTerm-width determination.
          defaultEditWidth: 30,
          minEndTermWidth: 100,
          minEndTermWideWidth: 200
        }
      });
      vueTick(() => {
        _termWidth(0).should.equal(100 + TermPadBordLR);
        _totalWidth().should.equal(100 + TermPadBordLR + PadLR);

        _termITrig(0, 'focus');
        vueTick(() => {
          _termWidth(0).should.equal(200 + TermPadBordLR);
          _totalWidth().should.equal(200 + TermPadBordLR + PadLR);

          _termITrigCEnter(0);
          vueTick(() => {
            _thereIsFocusedInputAt(1);
            _emitV(0, 'change').should.deep.equal([{ }]);
            _termWidth(0).should.equal(30 + TermPadBordLR); // =defaultEditWidth.
            _termWidth(1).should.equal(200 + TermPadBordLR);
            _totalWidth().should.equal(230 + TermPadBordLR * 2
              + PadLR + TermMarginHor);
            cb();
          });
        });
      });
    });


    it('a newly added Term gets reactive coordinates, and a `key` ' +
       'property', cb => {
      // Reactivity test in detail:
      // After Ctrl+Enter inserts Term, and then a Dblclick edits & widens
      // a Term before it, then the inserted term should move to the right.
      make({
        origTerms: [{ str: 'a' }, { }],
        defaultEditWidth: 100
      });
      vueTick(() => {
        _termITrigCEnter(1);
        vueTick(() => {
          _emitV(0, 'change').should.deep.equal([{ str: 'a' }, { }, { }]);
          var x = _termXPos(2);

          _termDblclick(0);
          vueTick(() => {
            (x < _termXPos(2)).should.equal(true);     // It moved to the right.
            (!!w.vm.terms[2].key).should.equal(true);  // It got a `.key`.
            cb();
          });
        });
      });
    });
  });



  describe('user-interaction: Alt+Up/Alt+Down moves an Edit-Term, and ' +
     'emits `change` + terms', () => {

    it('they have no effect when there is only 1 real Term', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _termITrigAUp(0);
        _termITrigAUp(0);
        _termITrigADown(0);
        _emit(0, 'change').should.equal(false);
        cb();
      });
    });


    it('they have no effect on the endTerm', cb => {
      make({ origTerms: [{ str: 'aaa' }, { str: 'bbb' }] });
      vueTick(() => {
        _termITrigAUp(2);
        _termITrigAUp(2);
        _termITrigADown(2);
        _emit(0, 'change').should.equal(false);
        cb();
      });
    });


    it('they move an Edit-Term left / right, cyclingly, keep input focused, ' +
       'and emit `change`', cb => {

      var origTerms = [{ str: 'a' }, { }, { str: 'b' }, { type: 'EL'}];
      var lastOrder = [0, 1, 2, 3];
      var moveNr = 0;
      make({ origTerms });

      // Arg. `termNr` always refers to a term-pos. in `origTerms`, even though
      // that term gets moved around between tests. - For ease of understanding.
      function testCase(termNr, arrow, newOrder, cbf) {
        w.vm.$forceUpdate();  // <-- Wake up lazy 'vue-test-utils@1.0.0-beta.25'.
        var from = lastOrder.indexOf(termNr);
        var to   = newOrder .indexOf(termNr);
        (arrow == 'U' ? _termITrigAUp : _termITrigADown)(from);
        vueTick(() => {
          var newTerms = newOrder.map(pos => origTerms[pos]);
          lastOrder = newOrder;
          _emitV(moveNr++, 'change').should.deep.equal(newTerms);
          _thereIsFocusedInputAt(to);
          _input().element.value.should.equal(termNr == 1 ? 'Aaa' : 'Bbb');
          cbf();
        });
      }

      vueTick(() =>
        _setInput(1, 'Aaa') +  // (Use `+` to combine, to avoid curly brackets).
        vueTick(() =>

          testCase(      1, 'U', [1, 0, 2, 3], () =>
            testCase(    1, 'U', [0, 2, 3, 1], () =>
              testCase(  1, 'D', [1, 0, 2, 3], () =>
                testCase(1, 'D', [0, 1, 2, 3], () =>

                  _termITrigTab(1) +  // Tab to the EL-type input at 3.
                  vueTick(() =>
                    _setInput(3, 'Bbb') +
                    vueTick(() =>

                      testCase(      3, 'D', [3, 0, 1, 2], () =>
                        testCase(    3, 'D', [0, 3, 1, 2], () =>
                          testCase(  3, 'U', [3, 0, 1, 2], () =>
                            testCase(3, 'U', [0, 1, 2, 3], cb )))) )) )))) ));
    });
  });



  describe('user-interaction: entering terms', () => {

    it('Enter on plain-input ER-Term creates R-Term', cb => {
      make({ origTerms: [{ type: 'ER' }] });
      vueTick(() => {
        _setInput(0, 'aa');
        vueTick(() => {
          _termITrigEnter(0);
          _termIsTypeR(0);
          _emitV(0, 'change').should.deep.equal([
            { str: 'aa', classID: null, instID: null, parentID: null }]);
          cb();
        });
      });
    });


    it('Enter on plain-input EL-Term creates L-Term', cb => {
      make({ origTerms: [{ type: 'EL' }] });
      vueTick(() => {
        _setInput(0, 'aa');
        vueTick(() => {
          _termITrigEnter(0);
          _termIsTypeL(0);
          _emitV(0, 'change').should.deep.equal([{ str: 'aa' }]);
          cb();
        });
      });
    });


    it('Enter after editing an existing R-Term: keeps its original parentID/' +
       'classID/dictID/descr and resets style; i.e. editing only changes an ' +
        'R-Term\'s label', cb => {
      make({ origTerms: [
        { str: 'aa', style: 'i', dictID: 'A', descr: 'abc',
          classID: 'A:01', instID: null, parentID: 'x:123' }] });
      vueTick(() => {
        _termIsTypeR(0);
        _termDblclick(0);
        vueTick(() => {
          _setInput(0, 'aaB');
          _termITrigEnter(0);
          _termIsTypeR(0);
          _emitV(0, 'change').should.deep.equal([{ type: 'ER' }]); // No `style`.
          _emitV(1, 'change').should.deep.equal([
            { str: 'aaB', // New `str`. No `style` (already since start-to-edit).
              classID: 'A:01', instID: null, parentID: 'x:123',
              dictID: 'A', descr: 'abc' }]);
          cb();
        });
      });
    });


    it('keeps all IDs/dictID/descr after changing R-Term to L-Term, editing ' +
       'its label, Enter, and change back to R-Term', cb => {
      make({ origTerms: [
        { str: 'aa', dictID: 'A', descr: 'abc',
          classID: 'A:01', instID: 'id5', parentID: 'id3' }] });  // R-Term.
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick(0); _termCClick(0); _termCClick(0);  // Change to L-Term.
        vueTick(() => {
          _termIsTypeL(0);
          _termDblclick(0);  // Edit, i.e. change to EL-Term.
          vueTick(() => {
            _termIsTypeEL(0);
            _setInput(0, 'aaB');
            _termITrigEnter(0);   // Enter new label; changes back to L-Term.
            vueTick(() => {
              _termIsTypeL(0);
              _termCClick(0);  // Change back to R-Term.
              vueTick(() => {
                _termIsTypeR(0);
                _emitV(5, 'change').should.deep.equal([
                  { str: 'aaB', dictID: 'A', descr: 'abc',
                    classID: 'A:01', instID: 'id5', parentID: 'id3' }]);
                cb(); }); }); }); }); });
    });


    it('Enter on a normal list-item (in autocomplete) creates an I-type ' +
       'Term', cb => {
      make({ origTerms: [{ }] });  // An EI-type Term.
      vueTick(() => {
        _termIsTypeEI(0);
        _setInput(0, 'a');
        vueTick(() => {
          _termITrigEnter(0);  // Select the first list-item.
          _termIsTypeI(0);
          _term(0).text().should.equal('aax');
          _emitV(0, 'change').should.deep.equal([
            { str: 'aax', classID: 'A:01', instID: null,
              dictID: 'A', descr: 'ddx' }]);
          cb();
        });
      });
    });


    it('..and hereby applies `style`', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _setInput(0, 'a');
        vueTick(() => {
          _termITrigDown(0);   // } Select the second list-item.
          _termITrigEnter(0);  // }
          _termIsTypeI(0);
          _term(0).text().should.equal('aay');
          _term(0).html().includes('<i>aay</i>').should.equal(true);
          _emitV(0, 'change').should.deep.equal([
            { str: 'aay', style: 'i', classID: 'A:02', instID: null,
              dictID: 'A' }]);
          cb();
        });
      });
    });


    it('Enter on a normal list-item, in an EC-type Term, creates a C-type ' +
       'Term', cb => {
      make({ origTerms: [{ type: 'EC' }] });
      vueTick(() => {
        _termIsTypeEC(0);
        _setInput(0, 'a');
        vueTick(() => {
          _termITrigEnter(0);
          _termIsTypeC(0);
          _term(0).text().should.equal('aax');
          _emitV(0, 'change').should.deep.equal([
            { str: 'aax', classID: 'A:01', dictID: 'A', descr: 'ddx' }]);
          cb();
        });
      });
    });


    it('Enter on a number-string list-item creates an I-type Term, with ' +
       'no `descr`, but with a `dictID`', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _setInput(0, '5');
        vueTick(() => {
          _termITrigEnter(0);
          _termIsTypeI(0);
          _term(0).text().should.equal('5');
          _emitV(0, 'change').should.deep.equal([
            { str: '5', classID: '00:5e+0', instID: null, dictID: '00' }]);
          cb();
        });
      });
    });


    it('Enter on a refTerm list-item creates an R-type Term, with ' +
       'no `descr`', cb => {
      make({ origTerms: [{ }] });
      vueTick(() => {
        _setInput(0, 'it');
        vueTick(() => {
          _termITrigEnter(0);
          _termIsTypeR(0);
          _term(0).text().should.equal('it');
          _emitV(0, 'change').should.deep.equal([
            { str: 'it', classID: null, instID: null, parentID: null }]);
          cb();
        });
      });
    });


    it('Enter on a refTerm list-item, in Term that went R->I->EI: resets' +
       '`class/parentID`; i.e. refTerm-selection creates a clean R-Term', cb => {
      make({ origTerms: [
        { str: 'it', classID: 'A:01', instID: null, parentID: 'x:123' }] });
      vueTick(() => {
        _termIsTypeR(0);
        _termCClick(0);
        _termIsTypeI(0);
        _termDblclick(0);
        vueTick(() => {
          _termIsTypeEI(0);
          _termITrigEnter(0);
          _termIsTypeR(0);
          _emitV(0, 'change').should.deep.equal([
            { str: 'it', classID: 'A:01', instID: null }]);
          _emitV(1, 'change').should.deep.equal([{ }]);
          _emitV(2, 'change').should.deep.equal([
            { str: 'it', classID: null, instID: null, parentID: null }]);
          cb();
        });
      });
    });


    it('Enter on list-item-literal either creates an I/C-Term with `classID==' +
       'null`, or calls `advancedSearch()`, depending on given props', cb => {
      function testCase(type, allowClassNull, advancedSearch, resultID, cbf) {
        make({
          origTerms: [ type == 'EI' ? { } : { type }],
          allowClassNull,
          advancedSearch
        });
        vueTick(() => {
          _setInput(0, 'Q');  // Gives no matches; gives only the item-literal.
          vueTick(() => {
            _termITrigEnter(0);
            (type == 'EI'  &&  _termIsTypeI(0))  ||  _termIsTypeC(0);

            var result = { str: 'Q', classID: resultID };
            if (type == 'EI')  result.instID = null;
            _emitV(0, 'change').should.deep.equal([result]);
            cbf();
          });
        });
      }

      // Note: no item-literal shown for `!allowClassNull && !advancedSearch`.
      var advSrch = (data, cb) => cb({ str: data.str, id: 'ID5' });
      testCase(          'EI', false, advSrch, 'ID5', () =>
        testCase(        'EI', true,  false,   null,  () =>
          testCase(      'EI', true,  advSrch, 'ID5', () =>
            testCase(    'EC', false, advSrch, 'ID5', () =>
              testCase(  'EC', true,  false,   null,  () =>
                testCase('EC', true,  advSrch, 'ID5', cb))))));
    });


    it('passes `str/termType/vsmDictionary/queryOptions/allowClassNull` to ' +
       '`advancedSearch()`', cb => {
      var queryOptions = { idts: [{ id: 'X:99' }] };
      make({
        origTerms: [{ type: 'EC', queryOptions }],
        allowClassNull: false,
        advancedSearch,
        queryOptions: { perPage: 5 }  // It should not merge this into the above.
      });
      vueTick(() => {
        _setInput(0, 'aabbc');
        vueTick(() => {
          _termITrigEnter(0);
        });
      });
      function advancedSearch (data, cbf) {
        data.str           .should     .equal('aabbc');
        data.termType      .should     .equal('C');
        data.vsmDictionary .should     .equal(dict);
        data.queryOptions  .should.deep.equal(queryOptions);
        data.allowClassNull.should     .equal(false);
        cbf(false);
        cb();
      }
    });


    it('removes `queryOptions`\'s `.sort` before passing it to ' +
       '`advancedSearch()`', cb => {
      var queryOptions = {
        filter: { dictID: ['A', 'B', 'C', 'D'] },
        sort:   { dictID: ['A', 'B'] }
      };
      make({
        origTerms: [{ queryOptions }],
        advancedSearch
      });
      vueTick(() => {
        _termITrigSEnter(0);
      });
      function advancedSearch (data, cbf) {
        data.queryOptions.should.deep.equal({
          filter: { dictID: ['A', 'B', 'C', 'D'] }
        });
        cbf(false);
        cb();
      }
    });


    it('Shift+Enter does not try to launch `advancedSearch()` if ' +
       'unavailable', cb => {
      make({ });
      vueTick(() => {
        _termITrigSEnter(0);
        vueTick(cb);  // Here we just test that no error happens.
      });
    });


    it('shows Shift+Enter hotkey in item-literal, only if `advancedSearch()` ' +
       'is available; also with a `customItemLiteral` prop', cb => {
      function testCase(advancedSearch, customItemLiteral, showsHotkey, cbf) {
        make({ advancedSearch, customItemLiteral, allowClassNull: true });
        vueTick(() => {
          _setInput(0, 'aa');
          vueTick(() => {
            var itemLit = w.find('.item-type-literal');
            (itemLit.text().indexOf('Shift+Enter') >= 0)
              .should.equal(showsHotkey);
            cbf();
          });
        });
      }
      var advSrch = (data, cb) => cb({ str: data.str, id: 'ID5' });
      var custILt = data =>
        Object.assign(data.strs, { str: `_${ data.strs.str }_`});
      testCase(       false,   false,   false, () =>
        testCase(     false,   custILt, false, () =>
          testCase(   advSrch, false,   true,  () =>
            testCase( advSrch, custILt, true,  cb))));
    });


    it('Shift+Enter launches advancedSearch, for all Edit-Term types; and ' +
       'gives it the input string etc.', cb => {
      function testCase(type, str, cbf) {
        var queryOptions = { idts: [{ id: 'X:99' }] };
        make({
          origTerms: [ type=='EI' ? { queryOptions } : { type, queryOptions } ],
          allowClassNull: false,
          advancedSearch
        });
        vueTick(() => {
          if (str) {
            _setInput(0, str);
            vueTick(() => _termITrigSEnter(0));
          }
          else _termITrigSEnter(0);
        });
        function advancedSearch (data, cbf2) {
          data.str           .should     .equal(str);
          data.termType      .should     .equal(type.replace('E', ''));
          data.vsmDictionary .should     .equal(dict);
          data.queryOptions  .should.deep.equal(queryOptions);
          data.allowClassNull.should     .equal(false);
          cbf2(false);
          cbf();
        }
      }
      testCase(              'ER', 'abcd', () =>
        testCase(            'EI', 'abcd', () =>
          testCase(          'EC', 'abcd', () =>
            testCase(        'EL', 'abcd', () =>
              testCase(      'ER', '',     () =>  // Also launches for empty Str.
                testCase(    'EI', '',     () =>
                  testCase(  'EC', '',     () =>
                    testCase('EL', '',     cb))))))));
    });


    it('after Enter on EI-Term, I-Term keeps `min/maxWidth`', cb => {
      make({
        origTerms: [{ minWidth: 20, maxWidth: 120 }],
        allowClassNull: true
      });
      vueTick(() => {
        _setInput(0, 'Q');
        vueTick(() => {
          // In this test-case, Enter on item-literal creates classID-null Term.
          _termITrigEnter(0);
          _emitV(0, 'change').should.deep.equal([{
            str: 'Q', classID: null, instID: null, minWidth: 20, maxWidth: 120
          }]);
          cb();
        });
      });
    });


    it('after Enter on EI-Term, and Dblclick on the I-Term, the new EI-Term ' +
       'keeps `editWidth`', cb => {
      make({
        origTerms: [{ editWidth: 200 }],
        allowClassNull: true
      });
      vueTick(() => {
        _setInput(0, 'Q');
        vueTick(() => {
          _termITrigEnter(0);
          vueTick(() => {
            _emitV(0, 'change').should.deep.equal([
              { str: 'Q', classID: null, instID: null, editWidth: 200}]);

            _termDblclick(0);
            _emitV(1, 'change').should.deep.equal([{ editWidth: 200 }]);
            cb();
          });
        });
      });
    });


    it('a newly added new endTerm gets reactive coordinates, and a `key` ' +
       'property', cb => {
      // (Similar reactivity test as for a Ctrl+Enter-added Term).
      make({
        origTerms: [{ str: 'a' }],
        defaultEditWidth: 100,
        advancedSearch: (data, cbf) => cbf({ str: 'Q', id: 'A1' })
      });
      vueTick(() => {
        _termITrigSEnter(1);  // Launch `advancedSearch()` on the endTerm.
        vueTick(() => vueTick(() => {  // (Because $nextTick wraps advSrch-call).
          _emitV(0, 'change').should.deep.equal(
            [{ str: 'a' }, { str: 'Q', classID: 'A1', instID: null }]);
          var x = _termXPos(2);  // X-coordinate of new endTerm.

          _termITrig(2, 'blur');  // First let endTerm adjust to blurred state.
          _termDblclick(0);  // Make first Term wider by making it editable.
          vueTick(() => {
            (x < _termXPos(2)).should.equal(true);  // The endTerm moved right.
            (!!w.vm.terms[2].key).should.equal(true);  // It got a `.key`.
            cb();
          });
        }));
      });
    });
  });



  describe('handling of `advancedSearch()` return values', () => {

    /**
     * This `make()`s a TheTerms component, enters a string in its first Term
     * (having autocomplete), selects the item-literal, and calls the callback.
     */
    function prep(props, cbf) {
      make(props);
      vueTick(() => {
        _setInput(0, 'Q');  // Gives no matches; shows only the item-literal.
        vueTick(() => {
          _termITrigEnter(0);  // Enter on the item-literal, with input-str 'Q'.
          cbf();
        });
      });
    }


    it('if `advancedSearch()` returns `false, no Term is generated', cb => {
      prep(
        { origTerms: [{ }],
          advancedSearch: (data, cbf) => cbf(false)
        },
        () => {
          _termIsTypeEI(0);
          _emit(0, 'change').should.equal(false);
          cb();
        });
    });


    it('if `advancedSearch()` returns an Object with `id==null`, an I/C-Term ' +
       'is only generated if `allowClassNull==true`', cb => {
      function testCase(allowClassNull, cbf) {
        prep(
          { origTerms: [{ }],
            allowClassNull,
            advancedSearch: (data, cbf2) => cbf2({ str: 'test', id: null })
          },
          () => {
            if (!allowClassNull) {  // Case 1: It did not fill the Edit-Term.
              _termIsTypeEI(0);
              _emit(0, 'change').should.equal(false);
            }
            else {  // Case2: It generated a I-type Term.
              _termIsTypeI (0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'test', classID: null, instID: null }]);
            }
            cbf();
          });
      }
      testCase(  false, () =>
        testCase(true,  cb));
    });


    it('if `advancedSearch()` returns an Object with `str==\'\'`: ' +
       'aborts', cb => {
      prep(
        { origTerms: [{ }],
          advancedSearch: (data, cbf) => cbf({ str: '', id: 'A1' })
        },
        () => {
          _termIsTypeEI(0);
          _emit(0, 'change').should.equal(false);
          cb();
        });
    });


    it('`termType` (R/I/C/L) determines the created Term\'s type, ' +
       'for any `id` (null, empty, or truthy)', cb => {
      function testCase(termType, id, cbf) {
        prep(
          { origTerms: [{ }],
            allowClassNull: true,
            advancedSearch: (data, cbf2) => cbf2({ str: 'xy', id, termType })
          },
          () => {
            ///D(_emitV(0, 'change'));
            if (termType == 'R') {
              _termIsTypeR(0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'xy', classID: null,  // Note: classID always null when..
                  instID: null, parentID: null }]);   // ..parentID is null too.
            }
            else if (termType == 'I') {
              _termIsTypeI(0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'xy', classID: id || null, instID: null }]);
            }
            else if (termType == 'C') {
              _termIsTypeC(0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'xy', classID: id || null }]);
            }
            else if (termType == 'L') {
              _termIsTypeL(0);
              _emitV(0, 'change').should.deep.equal([{ str: 'xy' }]);
            }
            cbf();
          });
      }
      testCase(                      'R', null, () =>
        testCase(                    'R', '',   () =>
          testCase(                  'R', 'C1', () =>
            testCase(                'I', null, () =>
              testCase(              'I', '',   () =>
                testCase(            'I', 'C1', () =>
                  testCase(          'C', null, () =>
                    testCase(        'C', '',   () =>
                      testCase(      'C', 'C1', () =>
                        testCase(    'L', null, () =>
                          testCase(  'L', '',   () =>
                            testCase('L', 'C1', cb))))))))))));
    });


    it('for `termType==\'R\'`: creates R-Term with non-null `parent/classID`, ' +
       'only for both non-empty-nor-null `id` & `parentID`', cb => {
      function testCase(id, parentID, cbf) {
        prep(
          { origTerms: [{ }],
            allowClassNull: true,
            advancedSearch: (data, cbf2) => cbf2({ termType: 'R', str: 'xy',
              id, parentID })
          },
          () => {
            var c, p;
            if (id && parentID) { c = id;  p = parentID } // Only if both truthy.
            else c = p = null;

            _termIsTypeR(0);
            _emitV(0, 'change').should.deep.equal([
              { str: 'xy', classID: c, instID: null, parentID: p }]);
            cbf();
          });
      }
      testCase(                null, null, () =>
        testCase(              '',   null, () =>
          testCase(            'C1', null, () =>
            testCase(          null, '',   () =>
              testCase(        '',   '',   () =>
                testCase(      'C1', '',   () =>
                  testCase(    null, 'P1', () =>
                    testCase(  '',   'P1', () =>
                      testCase('C1', 'P1', cb)))))))));
    });


    it('for no `termType`, and `id==\'\'`: creates R-Term with all null IDs, ' +
       'also if `allowClassNull==false` (which pertains to I/C-Terms)', cb => {
      function testCase(allowClassNull, cbf) {
        prep(
          { origTerms: [{ }],
            allowClassNull,
            advancedSearch: (data, cbf2) => cbf2({ str: 'xy', id: '' })
          },
          () => {
            _termIsTypeR(0);
            _emitV(0, 'change').should.deep.equal([
              { str: 'xy', classID: null, instID: null, parentID: null }]);
            cbf();
          });
      }
      testCase(  true,  () =>
        testCase(false, cb));
    });


    it('for no `termType`, and `id==\'\'`: creates R-Term with all null IDs, ' +
       'also for ER-Term that was R-Term w. non-null `parentID` earlier', cb => {
      make({
        origTerms: [{ str: 'Abe', classID: 'C5', instID: 'i6', parentID: 'P7' }],
        advancedSearch: (data, cbf) => cbf({ str: 'xy', id: '' })
      });
      vueTick(() => {
        _termDblclick(0);  // Change Term 0 from type 'R' to 'ER'.
        vueTick(() => {
          _emitV(0, 'change').should.deep.equal([{ type: 'ER' }]);

          // Note: here we have *no* autocomplete, as we are in an ER-Term. And
          // so we have no item-lit. So here, invoke adv.Search with Shift+Enter.
          // (Note: just Enter replaces an R-term's label, see earlier test).
          _setInput(0, 'Q');
          vueTick(() => {
            _termITrigSEnter(0);  // Shift+Enter.
            _termIsTypeR(0);
            _emitV(1, 'change').should.deep.equal([
              { str: 'xy', classID: null, instID: null, parentID: null }]);
            cb();
          });
        });
      });
    });


    it('for no `termType`, and truthy `id`: uses Edit-Term\'s type ' +
       'EI/ER/EL or EC, to determine created Term\'s type I or C resp.', cb => {
      function testCase(type, cbf) {
        make({
          origTerms: [ type == 'EI' ? { } : { type }],
          advancedSearch: (data, cbf2) => cbf2({ str: 'xy', id: 'ID3' })
        });
        vueTick(() => {
          _setInput(0, 'Q');
          vueTick(() => {
            _termITrigSEnter(0); // Shift+Enter calls advSrch. for any Edit-Term.
            if (type != 'EC') {
              _termIsTypeI(0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'xy', classID: 'ID3', instID: null }]);
            }
            else {
              _termIsTypeC(0);
              _emitV(0, 'change').should.deep.equal([
                { str: 'xy', classID: 'ID3' }]);
            }
            cbf();
          });
        });
      }
      testCase(      'ER', () =>
        testCase(    'EI', () =>
          testCase(  'EC', () =>
            testCase('EL', cb))));
    });


    it('`style` is copied onto created R/I/C/L-Terms', cb => {
      function testCase(termType, cbf) {
        make({
          origTerms: [{ }],
          advancedSearch: (data, cbf2) => cbf2(
            { termType, str: 'xy', style: 'i' })
        });
        vueTick(() => {
          _termITrigSEnter(0);
          vueTick(() => {  // (vueTick#2 necessary, or next test-round fails!...)
            _emitV(0, 'change')[0].style.should.equal('i');
            cbf();
          });
        });
      }
      testCase(      'R', () =>
        testCase(    'I', () =>
          testCase(  'C', () =>
            testCase('L', cb))));
    });


    it('`dictID/descr` are copied to R/I/C-Terms, but not to L-Terms (when ' +
       'these are converted to an R-Term, dictID/descr do not appear)', cb => {
      function testCase(termType, cbf) {
        make({
          origTerms: [{ }],
          advancedSearch: (data, cbf2) => cbf2(
            { termType, str: 'xy', dictID: 'D1', descr: 'abc' })
        });
        vueTick(() => {
          _termITrigSEnter(0);
          vueTick(() => {
            var term = _emitV(0, 'change')[0];
            if (termType == 'R' || termType == 'I' || termType == 'C') {
              term.dictID.should.equal('D1');
              term.descr .should.equal('abc');
            }
            else {  // Else: termType is 'L'.
              expect(term.dictID).to.equal(undefined);
              expect(term.descr ).to.equal(undefined);

              _termCClick(0);  // Change type: L -> R.
              term = _emitV(1, 'change')[0];
              expect(term.dictID).to.equal(undefined);
              expect(term.descr ).to.equal(undefined);
            }
            cbf();
          });
        });
      }
      testCase(      'R', () =>
        testCase(    'I', () =>
          testCase(  'C', () =>
            testCase('L', cb))));
    });
  });



  describe('user-interaction: mouse-dragging Terms', () => {

    // We start from the same setup in most of our Term-drag tests.
    var co0, co1, co2;
    beforeEach(cb => {
      make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { }] });
      vueTick(() => {
        co0 = _termCoos(0);  // } Get the original coordinates (x/y/w/h) ..
        co1 = _termCoos(1);  // } ..of each Term.
        co2 = _termCoos(2);  // }
        cb();
      });
    });


    it('mousemove without mousedown has no effect', cb => {
      _windMMove(1000, 1000);
      _termCoos(0)  .should.deep.equal(co0);
      _dragPlh().exists().should.equal(false);
      _emitV(0, 'change').should.equal(false);
      cb();
    });


    it('mousedown on a Term + tiny mousemove has no effect', cb => {
      _termMDown(0, co0.x + 0, co0.y + 0); // Mousedown on it, with 0 dragOffset.

      _windMMove(co0.x + 1, co0.y + 2);  // 1*1+2*2 < termDragThreshold^2.

      _termCoos(0)  .should.deep.equal(co0);   // It didn't move yet.
      _dragPlh().exists().should.equal(false); // No placeholder there yet.
      _emitV(0, 'change').should.equal(false);
      _windBlur();  // This detaches the window-listeners. Note that..
      cb();              // .. an `afterEach()` does this already too!
    });


    it('mousedown + mousemove at/past `termDragThreshold`: moves a Term, and ' +
       'puts a same-sized drag-placeholder at its original place', cb => {
      _termMDown(0, co0.x + 0, co0.y + 0);
      _windMMove(co0.x + 3, co0.y + 0);  // 3*3+0*0 >= termDragThreshold^2.

      _termCoos(0)  .should.deep.equal(_moveCoos(co0, 3, 0));  // The Term moved.
      _dragPlhCoos().should.deep.equal(co0); // Plh. at Term's orig pos & size.
      _dragPlh().exists().should.equal(true);
      _emitV(0, 'change').should.equal(false);
      cb();
    });


    it('mousedown + small mousemove at/past `termDragThreshold`, then mouseup' +
       ': restores the Term at its original position', cb => {
      _termMDown(0, co0.x + 0, co0.y + 0);
      _windMMove(co0.x + 3, co0.y + 0);
      _windMUp  (co0.x + 3, co0.y + 0);  // Mouse-up, at coos of last position.
      _termCoos(0)  .should.deep.equal(co0);  // Term back at its orig. pos.
      _dragPlh().exists().should.equal(false);
      _emitV(0, 'change').should.equal(false);
      cb();
    });


    it('on blurring the browser-window: also finishes dragging', cb => {
      _termMDown(0, co0.x + 0, co0.y + 0);
      _windMMove(co0.x + 3, co0.y + 0);
      _windBlur ();
      _termCoos(0)  .should.deep.equal(co0);  // Term back at its orig. pos.
      _dragPlh().exists().should.equal(false);
      _emitV(0, 'change').should.equal(false);
      cb();
    });


    it('takes the mousedown-position/offset inside the Term into account ' +
       'when moving a Term', cb => {
      _termMDown(0, co0.x + 2,     co0.y + 0);
      _windMMove(   co0.x     + 3, co0.y + 0);
      _dragPlh().exists().should.equal(false);  // No placeholder yet.

      _windMMove(   co0.x + 2 + 3, co0.y + 0);
      _dragPlh().exists().should.equal(true);  // Now the placeholder is there.
      cb();
    });


    it('Ctrl+Shift+Mousedown + drag: moves a non-Edit-Term', cb => {
      _termCSMDown(0, co0.x + 0, co0.y + 0);
      _windMMove  (   co0.x + 3, co0.y + 0);

      _termCoos(0)  .should.deep.equal(_moveCoos(co0, 3, 0));
      _dragPlhCoos().should.deep.equal(co0);
      _dragPlh().exists().should.equal(true);
      cb();
    });


    it('Ctrl+Shift+Mousedown + drag: moves an Edit-Term, and hides an open ' +
       'autocomplete-list', cb => {
      _termClick(2);  // Focus the Edit-Term, so it can respond to blur, below.
      _setInput(2, '123');  // Make an autocomplete result-list open.
      vueTick(() => {
        _thereIsFocusedInputAt(2);
        _term(2).find('.list').exists() .should.equal(true);

        _termCSMDown(2, co2.x + 0, co2.y + 0);
        _windMMove  (   co2.x + 3, co2.y + 5); // This also blurs the Edit-Term..
        //                             // .. and causes the result-list to close.

        _termCoos(2)  .should.deep.equal(_moveCoos(co2, 3, 5));
        _dragPlhCoos().should.deep.equal(co2);
        _dragPlh().exists().should.equal(true);
        _term(2).find('.list').exists() .should.equal(false);  // List is gone.
        cb();
      });
    });


    it('Ctrl+Shift+Mousedown on Edit-Term having the <input> and text: ' +
       'does not open an autocomplete-list', cb => {
      _termClick(2);
      _setInput(2, '123');  // Make an autocomplete result-list open.
      vueTick(() => {
        _termITrigEsc(2);  // Make the list close, and leave '123' in the input.
        vueTick(() => {
          _term(2).find('.list').exists() .should.equal(false);  // List is gone.

          _termCSMDown(2, co2.x + 0, co2.y + 0);  // Just C+S+mousedown, no move.
          vueTick(() => {
            _term(2).find('.list').exists() .should.equal(false);  // No list.
            cb();
          });
        });
      });
    });


    it('limits a dragged Term\'s movement to max. where it "sticks to" ' +
       'the series of Terms excluding the endTerm', cb => {
      // Note: this feature keeps a dragged Term visually closer to where its
      // placeholder is stepwise'ly moved to. And it emphasizes that the dragged
      // Term will stay within its VSM-box, no matter how far out the mouse goes.

      _term(0).text().should.equal('aa');    // } Sanity checks.
      _term(1).text().should.equal('bbbb');  // }

      // PART 1: drag the Term towards very far left and up.
      _termMDown(1, co1.x + 0, co1.y + 0);
      _windMMove(-1000, -1000);

      // Now the original Term 1 got dragged to before the original Term 0,
      // so they switched places!: the being-dragged term is now called Term 0.
      _term(0).text().should.equal('bbbb'); // Orig. Term 1 is our new Term 0.
      _term(1).text().should.equal('aa');
      _termCoos(0).should.deep.equal({
        x: co0.x - co1.w,  y: co1.y - co1.h,  // The Term sticks to the Term-..
        w: co1.w,          h: co1.h });       // ..series's top left corner.
      _dragPlhCoos().should.deep.equal({
        x: co0.x,  y: co0.y,
        w: co1.w,  h: co1.h });

      // PART 2: drag the Term towards very far right and down.
      _windMMove(1000, 1000);

      // Now the original Term 1 got dragged to after the original Term 2,
      // so they switched places: the being-dragged term is now called Term 2.
      _term(2).text().should.equal('bbbb'); // Orig. Term 1 is our new Term 2.
      _term(1).text().should.equal('');
      _termCoos(2).should.deep.equal({
        x: co2.x + co2.w,  y: co1.y + co1.h,  // The Term sticks to the Term-..
        w: co1.w,          h: co1.h });       // ..series's bottom right corner.
      _dragPlhCoos().should.deep.equal({
        x: co2.x + co2.w - co1.w,  y: co2.y,
        w: co1.w,                  h: co1.h });
      cb();
    });


    it('when dragging a Term, only when mouse-pointer moves to before mid. of ' +
       'Term before it: moves placeh. before that Term, emits `change`', cb => {
      // Note: it is based on *the mouse-pointer* moving over the left half of a
      //   hovered Term, and *not the middle of the dragged Term* moving there.
      // Because: imagine a narrow Term 1: "a", and a wide Term 2: "a...z".
      //   Now, if Term 2 is grabbed by its left half (e.g. its left border),
      //   and if Term 1 is placed ~against the browser window's left side,
      //   then the mouse can not drag Term 2's middle before Term 1's middle!
      //   But the mouse-pointer is able to move left to that extent.

      // Start dragging Term 1.
      _termMDown(1, co1.x + 5, co1.y + 2);

      // Moving the mouse to after the middle of Term 0 has no real effect.
      _windMMove(co1.x + 0 - TermMarginHor - co0.w / 2 + 1, co1.y);
      _term(0).text().should.equal('aa');
      _term(1).text().should.equal('bbbb');
      _dragPlhCoos().should.deep.equal({
        x: co1.x,  y: co1.y,  w: co1.w,  h: co1.h });
      _emitV(0, 'change').should.equal(false);

      // But when moving the mouse to before the middle of Term 0,
      // the Terms 1 and 0 switch place.
      _windMMove(co1.x + 0 - TermMarginHor - co0.w / 2 - 1, co1.y);
      _term(0).text().should.equal('bbbb');
      _term(1).text().should.equal('aa');
      _dragPlhCoos().should.deep.equal({
        x: co0.x,  y: co0.y,  w: co1.w,  h: co1.h });
      _emitV(0, 'change').should.deep.equal([{ str: 'bbbb' }, { str: 'aa' },{}]);
      cb();
    });


    it('when dragging a Term, only when mouse-pointer moves to past middle of ' +
       'Term after it: moves placeh. after that Term, emits `change`', cb => {
      // Start dragging Term 1.
      _termMDown(1, co1.x + 5, co1.y + 2);

      // Moving the mouse to before the middle of Term 2 has no real effect.
      _windMMove(co1.x + co1.w + TermMarginHor + co2.w / 2 - 1, co1.y);
      _term(1).text().should.equal('bbbb');
      _term(2).text().should.equal('');
      _dragPlhCoos().should.deep.equal({
        x: co1.x,  y: co1.y,  w: co1.w,  h: co1.h });
      _emitV(0, 'change').should.equal(false);

      // But when moving the mouse to after the middle of Term 2,
      // the Terms 1 and 2 switch place.
      _windMMove(co1.x + co1.w + TermMarginHor + co2.w / 2 + 1, co1.y);
      _term(1).text().should.equal('');
      _term(2).text().should.equal('bbbb');
      _dragPlhCoos().should.deep.equal({
        x: co2.x + co2.w - co1.w,  y: co1.y,  w: co1.w,  h: co1.h });
      _emitV(0, 'change').should.deep.equal([{ str: 'aa' }, {}, { str: 'bbbb'}]);
      cb();
    });


    it('on mouseup after dragging a Term to a new place: removes placeholder, ' +
       'puts dragged Term at its place, emits `change`', cb => {
      var key1 = w.vm.terms[1].key;

      // 1) Grab Term 1 (using a small offset, not just top-left).
      _termMDown(1, co1.x + 5,     co1.y + 2);

      // 2) Move the mouse, but less than drag-starting threshold.
      _windMMove(   co1.x + 5 + 1, co1.y + 2 + 0);                   ///DCoos();
      _term(1).text().should.equal('bbbb');
      _dragPlh().exists().should.equal(false);  // No placeholder yet.

      // 3) Move the mouse so that dragging starts.
      _windMMove(   co1.x + 5 + 3, co1.y + 2 + 1);                   ///DCoos();
      _term(1).text().should.equal('bbbb');
      _dragPlhCoos().should.deep.equal(co1);    // Placeholder at Term 1's pos.
      _emitV(0, 'change').should.equal(false);  // No real change yet.

      // 4) Move the Term to the end.
      _windMMove(1000, 1000);                                        ///DCoos();
      _term(2).text().should.equal('bbbb');
      _dragPlhCoos().x.should.equal(co2.x + co2.w - co1.w);  // Placeholder @end.
      _emitV(0, 'change').should.deep.equal(      // It emitted a first 'change'.
        [{ str: 'aa' }, { }, { str: 'bbbb' }]);

      // 5) Move & drop the Term to/at the front.
      _windMUp(1, -1000, 0);                                         ///DCoos();
      _term(0).text().should.equal('bbbb');
      _termCoos(0).should.deep.equal({          // Term is placed at front.
        x: co0.x,  y: co0.y,  w: co1.w,  h: co1.h });
      _dragPlh().exists().should.equal(false);  // No more placeholder.
      _emitV(1, 'change').should.deep.equal(    // It emitted a second 'change'.
        [{ str: 'bbbb' }, { str: 'aa' }, { }]);

      w.vm.terms[0].key.should.equal(key1);  // Term 1 actually moved to pos. 0.
      cb();
    });


    it('on window-blur after dragging a Term to a new place: (same)', cb => {
      var key1 = w.vm.terms[1].key;

      // 1) Move Term to front.
      _termMDown(1, co1.x, co1.y);
      _windMMove(-1000, 0);
      _term(0).text().should.equal('bbbb');
      _dragPlhCoos().x.should.equal(co0.x);
      _emitV(0, 'change').should.deep.equal(  // It emitted a first 'change'.
        [{ str: 'bbbb' }, { str: 'aa' }, { }]);

      // 2) Blur the browser window: == mouse-up, but without new coordinates.
      _windBlur(1);
      _term(0).text().should.equal('bbbb');
      _termCoos(0).should.deep.equal({
        x: co0.x,  y: co0.y,  w: co1.w,  h: co1.h });
      _dragPlh().exists().should.equal(false);
      _emitV(1, 'change').should.equal(false);  // It emitted no second 'change'.

      w.vm.terms[0].key.should.equal(key1);  // Term 1 actually moved to pos. 0.
      cb();
    });


    it('when dragging a Term left/right of the active Edit-Term: ensures ' +
       'the Edit-Term keeps the <input>-element', cb => {
      _termInput(2).exists().should.equal(true);
      _termHasCssClassInp(2);

      // PART 1: drag Term 1 to the right of (Edit-)Term 2.
      _termMDown(1, co1.x, co1.y);
      _windMMove(1000, 0);
      _term     (1).text()  .should.equal('');    // The Edit-Term is now..
      _termInput(1).exists().should.equal(true);  // ..at position 1.
      _termHasCssClassInp(1);
      _emitV(0, 'change').should.deep.equal(  // (Just an extra check).
        [{ str: 'aa' }, { }, { str: 'bbbb' }]);

      // PART 2: drag our Term (now at 2) back to left of the Edit-Term (now @1).
      _windMMove(co1.x, 0);
      _term     (2).text()  .should.equal('');    // The Edit-Term is now back..
      _termInput(2).exists().should.equal(true);  // ..at position 2.
      _termHasCssClassInp(2);
      _emitV(1, 'change').should.deep.equal(
        [{ str: 'aa' }, { str: 'bbbb' }, { }]);
      cb();
    });


    it('when dragging the active Edit-Term: ensures it keeps the ' +
       '<input>', cb => {
      _termCSMDown(2, co2.x + 5, co2.y + 3);
      _windMMove(-1000, 0);
      _windMUp(-1000, 0);  // Drop Term 2 at front, making it the new Term 0.
      _term     (0).text()  .should.equal('');
      _termInput(0).exists().should.equal(true);
      _termHasCssClassInp(0);
      cb();
    });


    const docStyle  = () => JSON.stringify(document.body.style);
    const mouseGrab = () => docStyle().should.include('"cursor":"grabbing"');
    const mouseNormal=() => docStyle().should.not.include('"cursor":"grabbing"');

    it('only when dragging past drag-threshold, changes the mouse cursor to ' +
       '\'grabbing\', and restores it on mouseup or window-blur', cb => {
      _termMDown(0, co0.x + 0, co2.y + 0);  // Only a mousedown.
      mouseNormal();
      _termMDown(0, co0.x + 2, co2.y + 0);  // Move less than threshold.
      mouseNormal();
      _windMMove(-1000, 0);  // Move more than threshold => mouse is grabbing.
      mouseGrab();
      _windMUp(-1000, 0);    // Mouseup => mouse is normal again.
      mouseNormal();

      _termMDown(0, co0.x + 0, co2.y + 0);  // Mousedown #2.
      _windMMove(-1000, 0);  // Large move again => mouse is grabbing.
      mouseGrab();
      _windBlur(-1000, 0);   // Window blur => mouse is normal again.
      mouseNormal();
      cb();
    });


    it('if `origTerms` changes while dragging: aborts dragging', cb => {
      _termCSMDown(1, co1.x + 1, co1.y + 2);
      _windMMove  (   co1.x + 5, co1.y + 5);
      _dragPlh().exists().should.equal(true);

      w.setProps({ origTerms: [{ str: 'aa' }, { str: 'bbBB' }, { }] });
      vueTick(() => {
        _dragPlh().exists().should.equal(false);
        cb();
      });
    });
  });



  describe('user-interaction: showing & hiding ThePopup', () => {

    // Many of the tests will start from this same setup.
    // Note that Term 0 is a non-Edit Term, as required by `_showPopupFor()`.
    beforeEach(cb => {
      make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { }] });
      vueTick(cb);
    });


    it('stays hidden on: no user-interaction', cb => {
      _popupHidden();  // No ThePopup at start.
      clock.tick(10000);
      _popupHidden();
      cb();
    });


    it('shows on: Dblclick on an Edit-Term', cb => {
      _popupHidden();  // No ThePopup at start.
      _termDblclick(2);
      _popupShownAt(2);  // (Note: assumes Term & popup have same left-X-coo).
      _termITrigEsc(2);
      _popupHidden();
      cb();
    });


    it('shows on: Hover a non-Edit-Term, if ThePopup is not yet shown for ' +
       'another Term: after a delay `delayPopupShow`', cb => {
      _termMEnter(1);
      clock.tick(sizes.delayPopupShow - 11); // < -10: account for _termTrig's..
      _popupHidden();                         // ..built-in 10ms `clock.tick()`.
      clock.tick(1);
      _popupShownAt(1);
      cb();
    });


    it('shows on: Hover a non-Edit Term, if ThePopup is already shown for ' +
       'another Term: after a delay `delayPopupSwitch`', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow);
      _popupShownAt(0);

      _termMEnter(1);
      clock.tick(sizes.delayPopupSwitch - 11);
      _popupShownAt(0);
      clock.tick(1);
      _popupShownAt(1);
      cb();
    });


    it('shows on: Hover an Edit-Term, if ThePopup is already shown for ' +
       'another Term: after a delay `delayPopupSwitch`', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow);
      _popupShownAt(0);

      _termMLeave(0);
      _termMEnter(2);
      clock.tick(sizes.delayPopupSwitch - 11);
      _popupShownAt(0);
      clock.tick(1);
      _popupShownAt(2);
      cb();
    });


    it('stays hidden on: Hover an Edit-Term, if ThePopup is not yet shown ' +
       'for another Term', cb => {
      _termMEnter(2);
      clock.tick(sizes.delayPopupShow + 1000);
      _popupHidden();
      cb();
    });


    it('shows on: Click on a non-Edit-Term (a real click, not only ' +
       'mousedown): after delay `delayPopupShow`', cb => {
      // Note: `delayPopupShow` prevents flashing ThePopup when a user Dblclicks.

      // First simulate the mousedown & -up events (which would be fired in real
      // life too). This tests that there is no interference with the code for
      // Term-dragging.
      _termMDown(1);
      clock.tick(20);
      _windMUp(1);
      clock.tick(20);

      _termClickFull(1);
      clock.tick(sizes.delayPopupShow - 11);
      _popupHidden();

      clock.tick(1);
      _popupShownAt(1);
      cb();
    });


    it('hides on: on non-Edit-Term: Unhover it, and no re-hover before delay ' +
       '`delayPopupHide` runs out: after that delay runs out', cb => {
      _showPopupFor(1);
      _popupShownAt(1);  // Sanity check of `show...()`, for a non-Edit-Term.

      _termMLeave(1);
      clock.tick(sizes.delayPopupHide - 11);
      _popupShownAt(1);
      clock.tick(10);
      _popupHidden();
      cb();
    });


    it('hides on: on Edit-Term: Unhover it, and no re-hover before delay ' +
       '`delayPopupHide` runs out: after that delay runs out', cb => {
      _showPopupFor(2);
      _popupShownAt(2);  // Sanity check of `show...()`, for an Edit-Term.

      _termMLeave(2);
      clock.tick(sizes.delayPopupHide - 11);
      _popupShownAt(2);
      clock.tick(10);
      _popupHidden();
      cb();
    });


    it('hides on: on ThePopup: Unhover it: after same delay', cb => {
      _showPopupFor(1);

      // Move the mouse from the Term to over ThePopup instead.
      _termMLeave(2);
      _popupMEnter();

      // Test that ThePopup remains visible after this.
      clock.tick(sizes.delayPopupHide + 1000);
      _popupShownAt(1);

      // Unhover ThePopup. Before delay expires, it remains shown. After, not.
      _popupMLeave();
      clock.tick(sizes.delayPopupHide - 11);
      _popupShownAt(1);
      clock.tick(10);
      _popupHidden();
      cb();
    });


    it('hides on: on any Term: Ctrl+Click', cb => {
      // Test: Ctrl+Click on same, non-Edit Term: hides ThePopup immediately.
      _showPopupFor(0);
      _termCClick(0);
      _popupHidden();

      // Extra test: Ctrl+Click on another Term should hide it too.
      _showPopupFor(0);
      _termCClick(0);
      clock.tick(sizes.delayPopupHide - 11);
      _popupHidden();

      // Test: Ctrl+Click on Edit Term: hides ThePopup immediately.
      _showPopupFor(2);
      _termCClick(2);
      _popupHidden();
      vueTick(cb);  // `vueTick` lets vue-test-utils finish some *Edit-Term*-..
      //            // ..related/queued events. Else, some next tests will hang.
      //            // Note: apparently this can not be put in an `afterEach()`.
    });


    it('hides on: on any Term: Alt+Click', cb => {
      _showPopupFor(0);  // For non-Edit-type Term.
      _termAClick(0);
      _popupHidden();

      _showPopupFor(2);  // For Edit-type Term.
      _termAClick(2);
      _popupHidden();
      vueTick(cb);
    });


    it('hides on: on any Term: Ctrl+Shift+Mousedown', cb => {
      _showPopupFor(0);  // For non-Edit-type Term.
      _termCSMDown(0);
      _popupHidden();
      _windBlur();  // Detach drag-related `window`-listeners, before next test.

      clock.tick(1000);  // (Skip the hacky 'prevent-show'-delay in the code).
      _showPopupFor(2);  // For Edit-type Term.
      _termCSMDown(2);
      _popupHidden();

      clock.tick(1000);
      vueTick(cb);
    });


    it('hides on: on a non-Edit Term: Dblclick', cb => {
      _showPopupFor(0);
      _termDblclick(0);
      _popupHidden();
      cb();
    });


    it('hides on: on a non-Edit Term: Mousedown', cb => {
      _showPopupFor(0);
      _termMDown(0);
      _popupHidden();
      cb();
    });


    it('hides on: on an Edit-Term: Mousedown', cb => {
      _showPopupFor(2);
      _termMDown(2);
      _popupHidden();
      vueTick(cb);
    });


    it('hides on: on an Edit-Term: Mousedown, in the endTerm', cb => {
      _showPopupFor(2);
      _termMDown(3);
      _popupHidden();
      vueTick(cb); // (Let mousedown still move the input; else next test hangs).
    });


    it('hides on: on an Edit-Term: typing in an Edit-Term\'s <input>', cb => {
      _showPopupFor(2);  // Term 2 is an Edit-type Term.
      _setInput(2, 'abc');
      _popupHidden();
      vueTick(cb);
    });


    it('hides on: on an Edit-Term: Backspace on empty input', cb => {
      _showPopupFor(2);
      _termITrigBksp(2);
      _popupHidden();
      vueTick(cb);
    });


    it('hides on: on an Edit-Term: Esc/Tab/Shift-Tab/Ctrl+Del/Ctrl+Enter' +
       'Shift+Enter/Alt+Up/Alt+Down', cb => {
      function testCase(trigFunc, cbf) {
        make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { }] });
        vueTick(() => {
          _showPopupFor(2);
          trigFunc(2);
          _popupHidden();
          vueTick(cbf);
        });
      }

      testCase(              _termITrigEsc,    () =>
        testCase(            _termITrigTab,    () =>
          testCase(          _termITrigSTab,   () =>
            testCase(        _termITrigCDel,   () =>
              testCase(      _termITrigCEnter, () =>
                testCase(    _termITrigSEnter, () =>
                  testCase(  _termITrigAUp,    () =>
                    testCase(_termITrigADown,  cb))))))));
    });


    it('hides on: in an Edit-Term: when the vsmAC-list opens', cb => {
      // Use a VsmDictionary that responds extremely slowly.
      var dict2 = new VsmDictionaryLocal({ refTerms: ['it'], delay: 10000 });
      make({
        origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { }],
        vsmDictionary: dict2
      });
      vueTick(() => {
        _setInput('it');
        vueTick(() => {
          _showPopupFor(2);

          // Hovering made ThePopup shown, before autocomplete results arrived.
          _term(2).find('.vsm-autocomplete .list').exists().should.equal(false);
          _popupShownAt(2);
          clock.tick(50000);

          // After a while, autocomplete results arrived, and ThePopup is gone.
          _term(2).find('.vsm-autocomplete .list').exists().should.equal(true);
          _popupHidden();
          vueTick(cb);
        });
      });
    });


    it('hides on: on an EI/EC-Term: selecting an item or the item-literal ' +
       '(`item-sel...`)', cb => {
      function testCase(type, itemLit, cbf) {
        make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, {...type&&{type}}] });
        vueTick(() => {
          _setInput('5');  // Generates a 'number-string' match in autocomplete.
          vueTick(() => {
            clock.tick(1000);
            vueTick(() => {
              _showPopupFor(2);  // Show popup while autocomplete list is shown.
              vueTick(() => {
                _popupShownAt(2);

                _term(2).find('.item-type-' + (itemLit ? 'literal' : 'number'))
                  .trigger('click');  // Click either nr-str, or item-literal.
                clock.tick(10);

                vueTick(() => {
                  _popupHidden();
                  (!type ? _termIsTypeI : _termIsTypeC)(2);  // Bonus test.
                  vueTick(cbf);
                });
              });
            });
          });
        });
      }

      testCase(      undefined, false, () =>  // `undefined` makes type 'EI'.
        testCase(    undefined, true,  () =>
          testCase(  'EC',      false, () =>
            testCase('EC',      true,  cb))));
    });


    it('hides on: on an ER/EL-Term: Enter (`plain-enter`)', cb => {
      function testCase(type, cbf) {
        make({ origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { type }] });
        vueTick(() => {
          _setInput('abc');
          _showPopupFor(2);
          vueTick(() => {
            _popupShownAt(2);
            _termITrigEnter(2);
            vueTick(() => {
              _popupHidden();
              (type == 'ER' ? _termIsTypeR : _termIsTypeL)(2);  // Bonus test.
              vueTick(cbf);
            });
          });
        });
      }

      testCase(  'ER', () =>
        testCase('EL', cb));
    });


    it('hides on: hovering a non-Edit Term (and popup shows), then hovering ' +
       'an Edit-Term, but then Esc before `delayPopupSwitch`', cb => {
      _showPopupFor(0);
      _termMLeave(0);
      _termMEnter(2);
      clock.tick(sizes.delayPopupSwitch - 20);
      _popupShownAt(0);  // Still at Term 0, before the delayed switch.
      _termITrigEsc(2);  // Esc aborts switch and should hide it.
      clock.tick(10);
      _popupHidden();    // It it hidden about-immediately.
      clock.tick(10000);
      _popupHidden();    // And it stays hidden.
      vueTick(cb);
    });


    it('stays hidden on: hovering a non-Edit-Term, but then Esc on the ' +
       'currently active Edit-Term before `delayPopupShow`', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();
      _termITrigEsc(2);
      clock.tick(10000);
      _popupHidden();
      vueTick(cb);
    });


    it('stays hidden on: hovering a non-Edit-Term, but then Click on an ' +
       'Edit-Term before `delayPopupShow`', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();
      _termClick(2);
      clock.tick(10000);
      _popupHidden();
      vueTick(cb);
    });


    it('stays hidden on: hovering non-Edit-Term, then hovering Edit-Term ' +
       'before show-delay, then Click on endTerm before show-delay', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();

      _termMLeave(0);
      _termMEnter(2);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();

      _termClick(3);  // Click on endTerm.
      clock.tick(10000);
      _popupHidden();
      vueTick(cb);
    });


    it('shows on: Hover a non-Edit-Term, then Unhover it before show-delay, ' +
       'then Hover it before hide-delay: shows after show-delay', cb => {
      // Note: this tests that no hide-delay timer is set, and so a new
      //       hover-action will show it after the normal delay.
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();

      _termMLeave(0);
      clock.tick(sizes.delayPopupHide - 20);
      _popupHidden();

      _termMEnter(0);
      clock.tick(sizes.delayPopupShow - 20);
      _popupHidden();
      clock.tick(20);
      _popupShownAt(0);
      cb();
    });


    it('stays hidden on: Hover, Mousedown, window-Mouseup, Click, ' +
       'Dblclick to edit on non-Edit-Term', cb => {
      // Note: this sequence of events happens before Dblclick to edit a Term.
      // We tests that Hover and Click's show-timers are cancelled, at Dlbclick.
      var term = _term(0);
      term.trigger('mouseenter');
      clock.tick(20);
      _popupHidden();
      term.trigger('mousedown.left');
      clock.tick(20);
      _popupHidden();
      term.trigger('mouseup.left');
      _windMUp();  // (Because the drag-related code listens to window-mouseup).
      clock.tick(20);
      _popupHidden();
      term.trigger('click.left');
      clock.tick(20);
      _popupHidden();
      term.trigger('dblclick.left');
      clock.tick(20);
      _termIsTypeEL(0);
      clock.tick(1000);
      _popupHidden();
      vueTick(cb);
    });


    it('stays hidden on: a Mousedown, long pause, drag to start ' +
       'Term-dragging, pause', cb => {
      // Test 1: Stays hidden during drag&drop below `termDragThreshold`.
      var co0 = _termCoos(0);
      _termMDown(0, co0.x + 0, co0.y + 0);
      clock.tick(1000);
      _popupHidden();

      _windMMove(co0.x + 1, co0.y + 2);
      clock.tick(1000);
      _popupHidden();

      _windMUp(0, co0.x + 0, co0.y + 0);
      clock.tick(1000);
      _popupHidden();

      // Test 2: Stays hidden during drag&drop above `termDragThreshold`.
      _termMDown(0, co0.x + 0, co0.y + 0);
      _windMMove(co0.x + 5, co0.y + 3);
      clock.tick(1000);
      _popupHidden();

      _windMUp(0, co0.x + 1, co0.y + 1);
      clock.tick(1000);
      _popupHidden();

      // Test 3: next, after mouseleave + mouseenter, it is able to appear again.
      _termMLeave(0);
      clock.tick(1000);
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow);
      _popupShownAt(0);
      cb();
    });


    it('stays shown on: Unhover a Term, when the delay `delayPopupHide` ' +
       'has not run out', cb => {
      _showPopupFor(1);
      _termMLeave(1);
      clock.tick(sizes.delayPopupHide - 20);
      _popupShownAt(1);
      cb();
    });


    it('stays shown on: Unhover a Term, but then rehover any Term before ' +
       'that delay runs out: still shows it after that delay', cb => {
      // Disable false warning caused by vue-test-utils@1.0.0-beta.28.
      fixWarnHandler('termMargin');

      _showPopupFor(1);

      // Test 1: leave and re-enter the same Term.
      _termMLeave(1);
      clock.tick(sizes.delayPopupHide - 20);
      _termMEnter(1);
      clock.tick(1000);
      _popupShownAt(1);

      // Test 2: leave and re-enter another Term.
      _termMLeave(1);
      clock.tick(sizes.delayPopupHide - 20);
      _termMEnter(2);
      clock.tick(1000);
      _popupShownAt(2);
      cb();
    });


    it('stays shown on: Unhover a Term but then soon Hover over ' +
       'ThePopup', cb => {
      _showPopupFor(1);
      _termMLeave(1);
      clock.tick(sizes.delayPopupHide - 20);
      _popupMEnter();
      clock.tick(1000);
      _popupShownAt(1);
      cb();
    });


    it('stays shown on: Unhover ThePopup but then soon Hover any Term or ' +
       'ThePopup again', cb => {
      fixWarnHandler('termMargin');  // Disable false warning (see above).

      _showPopupFor(1);
      _termMLeave(1);
      _popupMEnter();
      clock.tick(1000);

      // Test 1: leave ThePopup, then re-enter it.
      _popupMLeave();
      clock.tick(sizes.delayPopupHide - 20);
      _popupMEnter();
      _popupShownAt(1);

      // Test 2: leave ThePopup, then enter its Term.
      _popupMLeave();
      clock.tick(sizes.delayPopupHide - 20);
      _termMEnter(1);
      _popupShownAt(1);

      // Test 3: leave ThePopup, then enter another Term.
      _termMLeave(1);
      _popupMEnter();
      clock.tick(1000);
      _popupMLeave();
      clock.tick(sizes.delayPopupHide - 20);
      _termMEnter(2);
      clock.tick(sizes.delayPopupSwitch - 20);
      _popupShownAt(1);  // Popup still at original Term before switch-delay.
      clock.tick(20);
      _popupShownAt(2);  // Now it's at the new Term.
      cb();
    });


    it('stays shown on: Mousedown/Click/Doubleclick on ThePopup', cb => {
      _showPopupFor(1);
      _termMLeave(1);
      _popupMEnter();
      clock.tick(1000);

      _popup().trigger('mousedown.left');
      clock.tick(1000);
      _popupShownAt(1);

      _popup().trigger('click.left');
      clock.tick(1000);
      _popupShownAt(1);

      _popup().trigger('dblclick.left');
      clock.tick(1000);
      _popupShownAt(1);
      cb();
    });


    it('hides on: open a vsmAC-TheList, hover a non-Edit Term, ' +
       'then its ThePopup, then hover TheList', cb => {
      _setInput(2, 'a');
      vueTick(() => {
        _term(2).find('.list .item').exists().should.equal(true);

        _showPopupFor(1);
        _termMLeave(1);
        _popupMEnter();

        clock.tick(1000);
        _popupShownAt(1);
        _popupMLeave();
        _term(2).find('.list .item').trigger('mouseover');

        clock.tick(1000);
        _popupHidden();
        cb();
      });
    });


    it('stays shown on: hover a non-Edit Term, then hover an Edit-Term\'s ' +
       '<input>, with the mouse jumping over the Term\'s border', cb => {
      _showPopupFor(1);
      _termMLeave(1);
      _term(2).find('input').trigger('mouseover');

      clock.tick(1000);
      _popupShownAt(1);
      cb();
    });


    it('stays hidden on: hover immediately after creation (i.e. when a Term ' +
       'is placed under the mouse\'s current position)', cb => {
      make(
        { origTerms: [{ str: 'aa' }, { str: 'bbbb' }, { }] },
        10  // Do not skip the `tempDisablePopup`-timeout, used in all tests.
      );
      vueTick(() => {
        _termMEnter(0);
        clock.tick(sizes.delayPopupShow);
        _popupHidden();

        clock.tick(1000); // But after the initial block has passed, it responds.
        _termMLeave(0);
        _termMEnter(0);
        clock.tick(sizes.delayPopupShow);
        _popupShownAt(0);
        cb();
      });
    });


    it('stays hidden on: `origTerms` update, and then immediate hover', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow);
      _popupShownAt(0);

      w.setProps({ origTerms: [{ str: 'aa2' }] });
      vueTick(() => {
        _terms().length.should.equal(1);
        _popupHidden();

        _termMEnter(0);
        clock.tick(1000);
        _popupHidden();

        // Extra test: it still works when not immediately hovered.
        _termMLeave(0);
        _termMEnter(0);
        clock.tick(sizes.delayPopupShow);
        _popupShownAt(0);
        cb();
      });
    });


    it('stays hidden on: Enter a Term (via autocomplete), and then immediate ' +
       'hover (i.e. when new Term is inserted under mouse cursor)', cb => {
      _setInput(2, 'a');
      vueTick(() => {
        _termITrigEnter(2);
        _termIsTypeI(2);

        _termMEnter(2);
        clock.tick(1000);
        _popupHidden();

        // Extra test: it still works when not immediately hovered.
        _termMLeave(2);
        _termMEnter(2);
        clock.tick(sizes.delayPopupShow);
        _popupShownAt(2);
        cb();
      });
    });


    it('stays hidden on: DoubleClick-to-edit, Esc-to-restore, then immediate ' +
       'hover (i.e. when Term is restored under mouse cursor)', cb => {
      _termDblclick(1);
      vueTick(() => {
        _termITrigEsc(1);
        vueTick(() => {
          _termMEnter(1);
          clock.tick(1000);
          _popupHidden();

          // Extra test: it still works when not immediately hovered.
          _termMLeave(1);
          _termMEnter(1);
          clock.tick(sizes.delayPopupShow);
          _popupShownAt(1);
          cb();
        });
      });
    });


    it('stays hidden on: mouseenter, then Esc anywhere on the webpage during ' +
       'the show-delay', cb => {
      _termMEnter(0);
      clock.tick(sizes.delayPopupShow / 2);
      _windEsc();
      clock.tick(1000);
      _popupHidden();
      cb();
    });


    it('hides on: Esc anywhere on webpage', cb => {
      for (var i = 0; i < 2; i++) {  // Extra test: this is repeatable.
        _showPopupFor(0);
        clock.tick(1000);
        _popupShownAt(0);
        _windEsc();
        _popupHidden();
      }
      cb();
    });
  });



  describe('effect of props and Term changes on ThePopup\'s menu-items', () => {

    // Makes a TheTerms with the given term as Term 1, and
    // optional copy/paste-handler functions.
    // (Note: Term 0 is a non-Edit Term, as required by `_showPopupFor()`).
    const makeT1 = (term,
      termCopy = false, termPaste = false, allowClassNull = true  // =Defaults.
    ) => {
      make({
        origTerms: [{ str: 't0' }, term],
        termCopy, termPaste, allowClassNull
      });
    };


    it('has inactive Copy or Copy-Ref menu-items if prop ' +
       '`termCopy==false`', cb => {
      makeT1({ str: 'aa', classID: 'A:01', instID: 'i123' }, false);
      vueTick(() => {
        _showPopupFor(1);
        w.find('.popup .item.copy'    ).classes().should.include('inactive');
        w.find('.popup .item.copy-ref').classes().should.include('inactive');
        cb();
      });
    });


    it('has inactive Paste menu-item if prop `termCopy==false`; activates ' +
       'when `termCopy` gets a Function; deactivates when `false` again', cb => {
      function testPasteActive(active) {
        w.find('.popup .item.paste').classes().includes('inactive')
          .should.equal(!active);
      }
      makeT1({ }, false, false);  // Test the Paste menu-item on an Edit-Term.
      vueTick(() => {
        _showPopupFor(1);
        testPasteActive(false);

        // Note: thanks to reactivity, ThePopup stays visible during the whole
        // test, during which the Paste menu-item's state gets updated.
        w.setProps({ termPaste: x => x });
        testPasteActive(true);

        w.setProps({ termPaste: false });
        testPasteActive(false);
        cb();
      });
    });


    it('after changing I-Term with not-null instID to C/L-type: makes ' +
       'Copy-Ref menu-item inactive, ignores clicks', cb => {
      var called = 0;
      makeT1({ str: 'aa', classID: 'A:01', instID: 'i123' }, () => called = 1);
      vueTick(() => {
        // It's active for original I-type Term.
        _showPopupFor(1);
        w.find('.popup .item.copy-ref').classes().should.not.include('inactive');

        function testNextCase(typeCheck, active, cbf) {
          _termCClick(1);
          typeCheck(1);
          _showPopupFor(1);
          var wrap = w.find('.popup .item.copy-ref');
          wrap.classes().includes('inactive').should.equal(!active);
          wrap.trigger('click.left');
          vueTick(() => {  // Because it calls `termCopy` only after `$nextTick`.
            called.should.equal(active ? 1 : 0);
            called = 0;
            cbf();
          });
        }

        // When changing Term 1 to type C, and then L, Copy-Ref is inactive.
        testNextCase(    _termIsTypeC, false, () =>
          testNextCase(  _termIsTypeL, false, () =>

            // After changing it to R-type, it becomes active again, because
            // it keeps the original I-Term's instID as a backup.
            testNextCase(_termIsTypeR, true,  cb)));
      });
    });


    it('after changing R/I/C-Term with not-null classID to L-type, under ' +
       '!allowClassNull: keeps Set-Type-I/C items active, ' +
        'responds to clicks', cb => {
      // Note: it keeps those menu-items active because it keeps the classID as
      // a backup, so it can restore the Term to the original type, in valid way.
      function testCase(extraIDs, numCClicks, cbf) {
        makeT1(
          Object.assign({ str: 'aa', classID: 'A:01' }, extraIDs),
          false, false, false
        );
        vueTick(() => {
          _showPopupFor(1);
          var i = numCClicks;  while (i--)  _termCClick(1);
          _termIsTypeL(1);
          _showPopupFor(1);
          _ppType('inst' ).classes().should.not.include('inactive');
          _ppType('class').classes().should.not.include('inactive');

          // Click on 'Inst'.
          _ppType('inst' ).trigger('click.left');
          _termIsTypeI(1);
          _emitV(numCClicks, 'change')[1]
            .should.deep.equal({ str: 'aa', classID: 'A:01', instID: null });

          // It's already Inst now, but let's anyway click on 'Class'.
          _showPopupFor(1);
          _ppType('class').trigger('click.left');
          _emitV(numCClicks + 1, 'change')[1]
            .should.deep.equal({ str: 'aa', classID: 'A:01' });
          cbf();
        });
      }
      testCase(    { instID: null, parentID: 'id1' }, 3, () =>   // R-type.
        testCase(  { instID: null                  }, 2, () =>   // I-type.
          testCase({                               }, 1, cb)));  // C-type.
    });


    it('for R-term with null classID, or never-changed L-Term, ' +
       'under !allowClassNull: makes Set-Type-I/C items inactive', cb => {
      function testCase(extraIDs, cbf) {
        makeT1(Object.assign({ str: 'aa' }, extraIDs),  false, false,  false);
        vueTick(() => {
          _showPopupFor(1);
          _ppType('inst' ).classes().should.include('inactive');
          _ppType('class').classes().should.include('inactive');
          cbf();
        });
      }
      testCase(  {classID: null, instID: null, parentID: null}, () => // R-type.
        testCase({                                           }, cb)); // L-type.
    });


    it('..but keeps them active if allowClassNull==true', cb => {
      function testCase(extraIDs, cbf) {
        makeT1(Object.assign({ str: 'aa' }, extraIDs),  false, false,  true);
        vueTick(() => {
          _showPopupFor(1);
          _ppType('inst' ).classes().should.not.include('inactive');
          _ppType('class').classes().should.not.include('inactive');
          cbf();
        });
      }
      testCase(  {classID: null, instID: null, parentID: null}, () =>
        testCase({                                           }, cb));
    });


    it('..also keeps them active for ER/EL-Terms', cb => {
      function testCase(extraIDs, cbf) {
        makeT1(Object.assign({ str: 'aa' }, extraIDs),  false, false,  false);
        vueTick(() => {
          _showPopupFor(1);
          _ppType('inst' ).classes().should.include('inactive');
          _ppType('class').classes().should.include('inactive');
          cbf();
        });
      }
      testCase(  { type: 'ER' }, () =>
        testCase({ type: 'EL' }, cb));
    });
  });



  describe('user-interaction: Clicks on ThePopup\'s menu-items; ' +
     'and their emits', () => {

    // Makes a TheTerms with the given term as Term 1, and shows ThePopup for it.
    // (Note: Term 0 is a non-Edit Term, as required by `_showPopupFor()`).
    const makeWithPopup = (term, cb) => {
      make({ origTerms: [{ str: 't0' }, term] });
      vueTick(() => {
        _showPopupFor(1);
        cb();
      });
    };


    it('responds to Edit: on Click, closes ThePopup and makes its ' +
       'Term editable', cb => {
      makeWithPopup({ str: 'aa' }, () => {
        _ppItemClick('edit');
        _popupHidden();
        _termIsTypeEL(1);
        _emitV(0, 'change')[1].should.deep.equal({ type: 'EL' });
        cb();
      });
    });


    it('responds to Undo Edit', cb => {
      makeWithPopup({ str: 'aa' }, () => {
        _ppItemClick('edit');
        _showPopupFor(1);
        _ppItemClick('undo-edit');
        _popupHidden();
        _termIsTypeL(1);
        _emitV(1, 'change')[1].should.deep.equal({ str: 'aa' });
        cb();
      });
    });


    it('responds to Make Focal and Unset As Focal (=the same menu item, ' +
       'which sends `toggle-focal` events)', cb => {
      makeWithPopup({ str: 'aa' }, () => {
        _ppItemClick('focal');
        _popupHidden();
        _term(1).classes().should.contain('focal');
        _emitV(0, 'change')[1].should.deep.equal({ str: 'aa', isFocal: true });

        _showPopupFor(1);
        _ppItemClick('focal');  // Now the menu is 'Unset As Focal'.
        _popupHidden();
        _term(1).classes().should.not.contain('focal');
        _emitV(1, 'change')[1].should.deep.equal({ str: 'aa' });
        cb();
      });
    });


    it('responds to Insert', cb => {
      makeWithPopup({ str: 'aa' }, () => {
        _ppItemClick('insert');
        _popupHidden();
        vueTick(() => {
          _terms().length.should.equal(3);  // One more (excluding endTerm).
          _emitV(0, 'change').should.deep.equal(
            [{ str: 't0' }, {}, { str: 'aa' }] );
          _thereIsFocusedInputAt(1);
          cb();
        });
      });
    });


    it('when inserting a Term to the left of endTerm, the endTerm releases ' +
       'its claim to wide-width', cb => {
      make({
        origTerms: [],
        sizes: {  // Make endTerm get its wide-width, and not more.
          minWidth: 10,
          defaultEditWidth: 50,
          minEndTermWidth: 10, minEndTermWideWidth: 200
        }
      });
      vueTick(() => {
        _termClick(0);     // Focus the endTerm, so it gets its wideWidth.
        _termCClick(0);    // Change endTerm to EC-type, so we can track it.
        _termDblclick(0);  // Bring up ThePopup for endTerm.
        vueTick(() => {
          var origWidth = _termWidth(0);
          _ppItemClick('insert');
          vueTick(() => {
            _thereIsFocusedInputAt(0);
            (origWidth > _termWidth(1)).should.equal(true);

            // Test: the new Term got inserted before EC-type endTerm.
            _emitV(0, 'change').should.deep.equal([{ }]);
            _termIsTypeEC(1);
            cb();
          });
        });
      });
    });


    it('responds to Remove', cb => {
      makeWithPopup({ str: 'aa' }, () => {
        _ppItemClick('remove');
        _popupHidden();
        vueTick(() => {
          _terms().length.should.equal(1);  // One less (excluding endTerm).
          _emitV(0, 'change').should.deep.equal([{ str: 't0' }]);
          cb();
        });
      });
    });


    it('responds to Set Type with all 8 Term types (unless click on same ' +
       'type); and if it is an Edit-Term then re-focuses it [32 tests]', cb => {
      const items = { R: 'ref', I: 'inst', C: 'class', L: 'lit' };
      const objs = {
        R: { str: 'aa', classID: null, instID: null, parentID: null },
        I: { str: 'aa', classID: null, instID: null },
        C: { str: 'aa', classID: null },
        L: { str: 'aa' },
        ER: { type: 'ER' },
        EI: { },
        EC: { type: 'EC' },
        EL: { type: 'EL' }
      };
      const baseTypes =  ['R', 'I', 'C', 'L'];

      function testCase(type, newType, ePrefix, cbf) {
        var item    = items[newType];
        var term    = objs[ePrefix + type];
        var newTerm = objs[ePrefix + newType];
        makeWithPopup(term, () => {
          _ppItemTypeClick(item);
          vueTick(() => {
            if (type == newType) {  // Click on current-type item is ignored.
              _popupShownAt(1);
            }
            else {
              _popupHidden();
              _emitV(0, 'change')[1].should.deep.equal(newTerm);
              if (ePrefix)  _thereIsFocusedInputAt(1); // Edit-Term gets focused.
            }
            //D({oriTerm: term, newTerm});
            //D({type, newType, ePrefix});
            cbf();
          });
        });
      }

      // Make a queue of 32 async test-function calls. Then call them in series.
      var queue = [];
      ['', 'E'].forEach(ePrefix =>
        baseTypes.forEach(type =>
          baseTypes.forEach(newType =>
            queue.push( cbf => testCase(type, newType, ePrefix, cbf) ))));
      (function run(i) {
        queue[i](() => (++i != queue.length) ? run(i) : cb());
      })(0);
    });
  });



  describe('user-interaction: Clicks on ThePopup\'s Copy/Paste', () => {

    var termCopied;

    // Makes a TheTerms with the given term as Term 1, and with copy- and paste-
    // spy functions; and shows ThePopup for Term 1.
    // (Note: Term 0 is a non-Edit Term, as required by `_showPopupFor()`).
    const makeWithPopup = (term, props, cb) => {
      termCopied = false;
      make(Object.assign(
        { origTerms: [{ str: 't0' }, term],
          termCopy: term => termCopied = term,
          termPaste: () => termCopied
        },
        props
      ));
      vueTick(() => {
        _showPopupFor(1);
        cb();
      });
    };


    it('Copy on R/I-Term: passes a cleaned clone to function-prop `termCopy`, ' +
       'with `instID=null` and no `isFocal/*width/queryOptions`', cb => {
      function testCase(term, result, cbf) {
        makeWithPopup(term, {}, () => {
          _ppItemClick('copy');
          _popupHidden();
          vueTick(() => { // Needed because `termCopy` is called after $nextTick.
            termCopied.should.deep.equal(result);

            // Test that the given data is a clone, i.e. that a change to
            // one of its properties does not cause a change in TheTerms.
            termCopied.str = 'bbb';
            w.vm.terms[1].str.should.equal('aa');
            cbf();
          });
        });
      }

      var termR1 = {
        str: 'aa', classID: 'X', instID: 'Y', parentID: 'Z',
        isFocal: true, minWidth: 10, maxWidth: 20, editWidth: 30,
        queryOptions: { z: [] }
      };
      var termR2 = { str: 'aa', classID: 'X', instID: null, parentID: 'Z' };

      var termI1 = { str: 'aa', style: 'i', classID: 'X', instID: 'Y',
        minWidth: 10 };
      var termI2 = { str: 'aa', style: 'i', classID: 'X', instID: null };

      testCase(  termR1, termR2, () =>
        testCase(termI1, termI2, cb));
    });


    it('Copy on C/L-Term: passes a cleaned clone to `termCopy`', cb => {
      function testCase(term, result, cbf) {
        makeWithPopup(term, {}, () => {
          _ppItemClick('copy');
          _popupHidden();
          vueTick(() => { termCopied.should.deep.equal(result);  cbf() });
        });
      }
      var termC1 = { str: 'aa', style: 'b', classID: 'X', editWidth: 30 };
      var termC2 = { str: 'aa', style: 'b', classID: 'X' };
      var termL1 = { str: 'aa', style: 'b',                maxWidth: 10 };
      var termL2 = { str: 'aa', style: 'b' };
      testCase(  termC1, termC2, () =>
        testCase(termL1, termL2, cb));
    });


    it('Copy Reference on R/I-Term: passes cleaned clone, with `instID=null` ' +
       'and `parentID`=original instID to `termCopy`', cb => {
      function testCase(term, result, cbf) {
        makeWithPopup(term, {}, () => {
          _ppItemClick('copy-ref');
          _popupHidden();
          vueTick(() => {
            termCopied.should.deep.equal(result);

            // Test that the given data is a clone.
            termCopied.str = 'bbb';
            w.vm.terms[1].str.should.equal('aa');
            cbf();
          });
        });
      }
      var termR1 = { str: 'aa', classID: 'X', instID: 'YY',  parentID: 'Z'  };
      var termR2 = { str: 'aa', classID: 'X', instID: null,  parentID: 'YY' };
      var termI1 = { str: 'aa', classID: 'X', instID: 'QQ',  minWidth: 10 };
      var termI2 = { str: 'aa', classID: 'X', instID: null,  parentID: 'QQ' };
      testCase(  termR1, termR2, () =>
        testCase(termI1, termI2, cb));
    });


    it('Paste on Edit-Term: calls `termPaste`, fills in a cleaned clone of ' +
       'given Object, with no `isFocal/*width/queryOptions`; ' +
       'emits `change`', cb => {
      makeWithPopup({}, {}, () => {
        termCopied = {
          str: 'aa', style: 'i', classID: 'X', instID: 'Y', parentID: 'Z',
          isFocal: true, minWidth: 10, maxWidth: 20, editWidth: 30,
          queryOptions: { z: [] }
        };
        _ppItemClick('paste');
        _popupHidden();
        vueTick(() => {
          // It also set an incorrectly given not-null instID, to null.
          _emitV(0, 'change').should.deep.equal([
            { str: 't0' },
            { str: 'aa', style: 'i', classID: 'X', instID: null, parentID: 'Z' }
          ]);

          // Test that a clone of the given data was used.
          termCopied.str = 'bbb';
          w.vm.terms[1].str.should.equal('aa');
          cb();
        });
      });
    });


    it('Paste: can replace an EL-Term by a given C-Term; emits `change`', cb => {
      makeWithPopup({ type: 'EL' }, {}, () => {
        termCopied = { str: 'aa', classID: null };
        _ppItemClick('paste');
        _popupHidden();
        vueTick(() => {
          _emitV(0, 'change').should.deep.equal([
            { str: 't0' }, { str: 'aa', classID: null } ]);
          cb();
        });
      });
    });


    it('Paste: aborts if an I-Term with `classID==null` is given while prop ' +
       '`allowClassNull==false`', cb => {
      makeWithPopup({ type: 'EC' }, { allowClassNull: false }, () => {
        termCopied = { str: 'aa', classID: null };
        _ppItemClick('paste');
        _popupHidden();
        vueTick(() => {
          _termIsTypeEC(1);
          _emitV(0, 'change').should.equal(false);
          cb();
        });
      });
    });


    it('Paste: aborts if a Term with `str==\'\'` is given', cb => {
      makeWithPopup({}, {}, () => {
        termCopied = { str: '' };
        _ppItemClick('paste');
        _popupHidden();
        vueTick(() => {
          _termIsTypeEI(1);
          _emitV(0, 'change').should.equal(false);
          cb();
        });
      });
    });


    it('Paste, then Edit: keeps original `isFocal/*width/queryOptions` ' +
       'properties; emits `change` twice', cb => {
      var editTerm  = {
        isFocal: true, minWidth: 80, maxWidth: 200, editWidth: 123,
        queryOptions: { z: [{ id: 'xy' }] }
      };
      var coreCopyTerm  = { str: 'aa', style: 'b', classID: 'X', instID: null };
      var newTerm       = Object.assign({}, editTerm, coreCopyTerm);
      var givenCopyTerm = Object.assign({}, coreCopyTerm, {
        minWidth: 50, maxWidth: 50, editWidth: 50, queryOptions: { z: [] }
      });

      makeWithPopup(editTerm, {}, () => {
        termCopied = givenCopyTerm;
        _ppItemClick('paste');
        _popupHidden();
        vueTick(() => {
          // The emit already shows that the original minW/etc prop.s are kept.
          _emitV(0, 'change').should.deep.equal([{ str: 't0' }, newTerm ]);

          // vue-test-utils@1.0.0-beta.28 does not update things correctly now,
          // so we can not use the following line, but use the one below it:
          ///_termWidth(1).should.equal(80 + TermPadBordLR);
          w.vm.terms[1].width.should.equal(80 + TermPadBordLR);

          _termDblclick(1);
          vueTick(() => {
            _emitV(1, 'change').should.deep.equal([{ str: 't0' }, editTerm ]);
            _term(1).classes().should.include('focal');

            /// _termWidth(1).should.equal(123 + TermPadBordLR);
            w.vm.terms[1].width.should.equal(123 + TermPadBordLR);
            cb();
          });
        });
      });
    });


    it('Paste on endTerm: fills it in, adds a new endTerm; ' +
       'emits `change`', cb => {
      // We first make endTerm an EC-type Term, so that we can track
      // that Paste replaces it and adds a new EI-type endTerm.
      makeWithPopup({ str :'t1' }, {}, () => {
        termCopied = { str: 't2' };

        _terms().length.should.equal(2);
        _termCClick(2);
        vueTick(() => {
          _termIsTypeEC(2);

          _showPopupFor(2);
          _ppItemClick('paste');
          _popupHidden();

          vueTick(() => {
            _termIsTypeL (2);  _term(2).classes().should.not.include('end');
            _termIsTypeEI(3);  _term(3).classes().should    .include('end');
            _emitV(0, 'change').should.deep.equal(
              [{ str: 't0' }, { str: 't1' }, { str: 't2' }]);
            cb();
          });
        });
      });
    });


    it('assisted by external `termCopy` and `termPaste` functions, a Term can ' +
       'be copied and Pasted into another Edit-Term; emits `change`', cb => {
      var term = { str: 'x', classID: 'X', instID: 'YY' };
      makeWithPopup(term, {}, () => {
        _ppItemClick('copy');
        vueTick(() => {
          _showPopupFor(2);  // Paste it in the endTerm.
          _ppItemClick('paste');
          vueTick(() => {
            _emitV(0, 'change').should.deep.equal([
              { str: 't0' }, term, { str: 'x', classID: 'X', instID: null } ]);
            cb();
          });
        });
      });
    });
  });
});
