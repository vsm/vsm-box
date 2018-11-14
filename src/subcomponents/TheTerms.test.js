import TheTerms from './TheTerms.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/TheTerms', () => {

  var w;  // Each test will assign its created TheTerms-component to this var.

  const dict = new VsmDictionaryLocal({
    dictData: [
      { id: 'A', name: 'Aaa', entries: [
        { id: 'A:01', dictID: 'A', terms: [{ str: 'aax', descr: 'ddx' }] }
      ]}
    ],
    refTerms: ['it']
  });

  var clock; // For using fake timers. See description @VsmAutocomplete.test.js.
  beforeEach(() => { clock = sinon.useFakeTimers() });
  afterEach (() => { clock.restore() });

  const sizes = {  // Mock the `sizes` that parent component VsmBox would give.
    minWidth: 200,
    minEndTermWidth: 40,
    minEndTermWideWidth: 100,
    defaultEditWidth: 40,
    defaultMaxWidth: 0,
    widthScale: 1
  };

  const TermHeight = 18;  // Used by the mocked getRuler() and in tests.
  const CharWidth  =  5;  // ". (Our mock gives all charachters the same width).


  // This function is used by each test. It creates and mounts a component with
  // default+custom props, and gives it extra functionality needed for tests.
  const make = (props, wait = 10) => {
    w = mount(TheTerms, {
      propsData: Object.assign(
        { vsmDictionary: dict,
          maxStringLengths: {},
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
      }
    });

    if (wait)  clock.tick(wait); // Jump past Term's initial nofade-setTimeout().
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

  const _terms   = () => w.findAll('.terms .term:not(.ruler):not(.end)');
  const _termsET = () => w.findAll('.terms .term:not(.ruler)');  // +endTerm.
  const _term    = i  => _termsET().at(i);
  const _endTerm = () => w.find('.terms .term.end');

  const _termTrig = (i, ...event) => {
    _term(i).trigger(...event);
    clock.tick(10);  // Let any triggered dictionary-lookup responses complete.
  };
  const _termClick    = i => _termTrig(i, 'mousedown.left');
  const _termCClick   = i => _termTrig(i, 'mousedown.left', { ctrlKey: true });
  const _termAClick   = i => _termTrig(i, 'mousedown.left', { altKey: true });
  const _termDblclick = i => _termTrig(i, 'dblclick.left');

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
  const _termITrigAUp    = i => _termITrig(i, 'keydown.up',   { altKey: true });
  const _termITrigADown  = i => _termITrig(i, 'keydown.down', { altKey: true });
  const _termITrigEnter  = i => _termITrig(i, 'keydown.enter');
  const _termITrigSEnter = i => _termITrig(i, 'keydown.enter', {shiftKey: true});

  // Finds the only <input>, whichever Term it's currently attached to.
  const _input = () => w.find('.terms .term input.input');


  // Changes the content of the input. Argument 1 is optional.
  // + E.g. `_setInput('aa')` changes the input, wherever it currently is.
  //   E.g. `_setInput(2, 'aa')` also implies that it exists at `index` 2.
  const _setInput = (index, newValue) => {
    fixWarnHandler();
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
  // a prop directly ... initialValue"'. Happens for some _setInput() cases.
  function fixWarnHandler() {
    Vue.config.warnHandler = (msg, vm, trace) => {
      if (msg.includes('Prop being mutated: "initialValue"'))  return;
      console.log(`${msg}${trace}`);
    };
  }
  afterEach (() => { Vue.config.warnHandler = undefined });  // Reset every time.


  const _trigClick = pageX => {  // Trigger click on TheTerms' (padding) itself.
    w.trigger('mousedown.left', { pageX });
    clock.tick(10);
  };


  const _styleValue = (wrap, styleProp) => {
    // Extract e.g. the Number 45 from a style-attribute "width: 45px; .....".
    var re = new RegExp('(^|;)\\s*' + styleProp + ':\\s*(\\d+)px\\s*(;|$)');
    var s = wrap.attributes().style.match(re);
    return s === null ? false : +s[2];  // If style-prop. absent, return false.
  };
  const _termStyleValue = (i, styleProp) => _styleValue(_term(i), styleProp);
  const _termHeight = index => _termStyleValue(index, 'height');
  const _termWidth  = index => _termStyleValue(index, 'width');
  const _termXPos   = index => _termStyleValue(index, 'left');
  const _termYPos   = index => _termStyleValue(index, 'top');
  const _totalWidth = () => _styleValue(w, 'width');


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


  // See 'Term.test.js' for info on `_emit*()`.
  const _emit = (index = 0, str = '-') => {
    var emit = w.emitted(str);
    return emit !== undefined  &&  emit[index] !== undefined;
  };
  const _emitV = (index = 0, str = '-') =>
    _emit(index, str) ? w.emitted(str)[index][0] : false;


  const vueTick = cb => Vue.nextTick(() => {  // Shorthand function.
    clock.tick(10);  cb(); });
  const DE = () => D(w.emittedByOrder());  // eslint-disable-line no-unused-vars




  // --- THE TESTS ---

  describe('initialization', () => {

    it('initializes, when getting only the required props', () => {
      make({ });  // make() gives all & only required props a default value.
      w.isVueInstance().should.equal(true);
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
      make({ origTerms: [ { }, { }] });
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


    it('sets `placeholder` attr. only on unfocused endTerm, and if there ' +
       'are no real terms; and both so for plain & vsmAC endTerm-input', cb => {
      // Test 1: sets `placeholder` on a lone, unfocused, vsmAC-having endTerm.
      make({ origTerms: [], placeholder: 'abx' });
      vueTick(() => {
        _termInput(0).exists().should.equal(true); // endTerm's <input> at pos 0.
        _termInput(0).attributes().placeholder.should.equal('abx');
        _termITrig(0, 'focus');
        expect(_termInput(0).attributes().placeholder).to.equal(undefined);

        // Test 2: sets `placeholder` on lone, unfc., plain-input-having endTerm.
        make({ origTerms: [], placeholder: 'abx' });
        vueTick(() => {
          _termInput  (0).exists().should.equal(true);
          _termCClick (0);  // Change endTerm's type: EI -> EC ..
          _termCClick (0);  // .. -> EL.
          _termClsTest(0, ['term', 'edit', 'inp', 'lit', 'end']);
          _termInput  (0).attributes().placeholder.should.equal('abx');
          _termITrig(0, 'focus');
          expect(_termInput(0).attributes().placeholder).to.equal(undefined);

          // Test 3: omits `placeholder` on a non-lone endTerm.
          make({ origTerms: [{ str: 'aaa' }], placeholder: 'abx' });
          vueTick(() => {
            _termInput(1).exists().should.equal(true);
            expect(_termInput(1).attributes().placeholder).to.equal(undefined);

            // Test 4: omits `placehol.` on a real (non-endTerm), Edit-type Term.
            make({ origTerms: [{ type: 'EC' }], placeholder: 'abx' });
            vueTick(() => {
              _termInput(0).exists().should.equal(true);
              expect(_termInput(0).attributes().placeholder).to.equal(undefined);
              cb();
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

      var advSrch = (settings, cb) => cb({ str: settings.str, id: null });

      testCase(      false, false,   false, () =>
        testCase(    false, advSrch, true,  () =>
          testCase(  true,  false,   true,  () =>
            testCase(true,  advSrch, true,  cb))));
    });


    it('fills VsmAutocomplete\'s itemLit with custom `itemLiteralContent`, or ' +
       'default content based on `allowClassNull` & `advancedSearch`', cb => {
      function testCase(allowClassNull, advancedSearch, iLtCont, result, cbf) {
        make({ allowClassNull, advancedSearch, itemLiteralContent: iLtCont });
        vueTick(() => {
          _setInput(0, 'aa');
          vueTick(() => {
            var itemLit = w.find('.item-type-literal');
            if (result === null)  itemLit.exists().should.equal(false);
            else  itemLit.text().startsWith(result).should.equal(true);
            cbf();
          });
        });
      }

      var advSrch = (settings, cb) => cb({ str: settings.str, id: null });
      var iLtCont = s => `_123_${s}_`;
      var aa = ' \'aa\'';

      testCase(              false, false,   false,   null,          () =>
        testCase(            false, false,   iLtCont, null,          () =>
          testCase(          false, advSrch, false,   'Search' + aa, () =>
            testCase(        false, advSrch, iLtCont, '_123_aa_',    () =>
              testCase(      true,  false,   false,   'Create' + aa, () =>
                testCase(    true,  false,   iLtCont, '_123_aa_',    () =>
                  testCase(  true,  advSrch, false,   'Search' + aa, () =>
                    testCase(true,  advSrch, iLtCont, '_123_aa_',    cb))))))));
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



  describe('EndTerm\'s dimensions', () => {

    it('makes EndTerm\'s width fill an empty TheTerms', cb => {
      make({ origTerms: [] });
      vueTick(() => {
        _terms  ().length.should.equal(0);  // No normal Terms,..
        _termsET().length.should.equal(1);  // .. only an endTerm.

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
        _terms  ().length.should.equal(2);   // All normal Terms.
        _termsET().length.should.equal(3);   // All normal Terms + the endTerm.
        _term(2)  .text().should.equal('');  // The endTerm.
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
      'it shrinks endTerm accordingly, and does not widen TheTerms;',
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



  describe('User-interaction: changing input location', () => {

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
        _trigClick(startX - 5);
        vueTick(() => {
          _termInput(0).exists().should.equal(true);
          _inputHasFocus();
          _termInput(1).exists().should.equal(false);

          // Test 2: a click right of (or at) the endTerm-left-margin has effect.
          _trigClick(startX + 1);
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



  describe('User-interaction: Ctrl+Mousedown changes Term-type, and ' +
     'emits `change` + new terms array', () => {

    it('L-type changes to R, and the emitted term includes properties ' +
       '`class/inst/parentID==null` (even if `allowClassNull==false`)', cb => {
      // Note: `allowClassNull` only pertains to E- and C-type Terms.
      make({ origTerms: [{ str: 'aaa' }], allowClassNull: false });
      vueTick(() => {
        ///_term(0).classes().should.contain('term');
        ///_term(0).classes().should.contain('lit');
        _termIsTypeL(0);  // Is shorthand for the two lines above.

        ///_term(0).trigger('mousedown.left', {ctrlKey: true});  clock.tick(10);
        _termCClick(0);  // Is shorthand for the line above.

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
        origTerms: [{ str: 'a', classID: 'A:01', instID: null, parentID: null }],
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
        dictID: 'A:01', descr: 'xy'  // Extra test: only I/C-Terms emit these.
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
          { str: 'aaa', classID: null,  // Note: parentID==null, so classID==null.
            instID: 'id01', parentID: null }]);

        _termCClick(0);
        _termIsTypeI(0);
        _emitV(3, 'change').should.deep.equal([instTerm]);  // classID is back.
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
       'except for EI', cb => {  // (This was part of an earlier test already).
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


    it('change the type of the endTerm, and does not emit', cb => {
      make({ origTerms: [] });  // There is only an endTerm here.
      vueTick(() => {
        _term(0).classes().should.not.contain('class');
        _termCClick(0);
        _term(0).classes().should    .contain('class');
        _emit(0, 'change').should.equal(false);
        cb();
      });
    });
  });



  describe('User-interaction: Alt+Mousedown sets focal Term, and ' +
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
      make({ origTerms: [ {} ] });
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



  describe('User-interaction: Doubleclick to edit Term; Esc cancels, ' +
     'restores Term; both emit `change` + array', () => {

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
        { str: 'aaa', classID: null, instID: null, parentID: null },
        { type: 'ER' }, false, cb);
    });


    it('makes-editable and restores I-type Term: I -> EI -> I', cb => {
      testDblclickEsc(
        { str: 'aaa', classID: 'A:01', instID: null, ...extra }, { }, true, cb);
    });


    it('makes-editable and restores C-type Term: C -> EC -> C', cb => {
      testDblclickEsc(
        { str: 'aaa', classID: 'A:01', ...extra }, { type: 'EC' }, true, cb);
    });


    it('makes-editable and restores L-type Term: L -> EL -> L', cb => {
      testDblclickEsc({ str: 'aaa' }, { type: 'EL' }, false, cb);
    });


    it('restores the Term also after changing the Edit-Term\'s type: ' +
       'I->EI->EC->I', cb => {
      var term = { str: 'aaa', classID: 'A:01', instID: null, ...extra };
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



  describe('User-interaction: varia', () => {

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
  });



  describe('User-interaction: Bksp/Ctrl+Del/Ctrl+Enter on empty Edit-Term' +
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
          _termsET().length.should.equal(4);  // 4 Terms, including the endTerm.
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



  describe('User-interaction: Alt+Up/Alt+Down moves an Edit-Term, and ' +
     'emits both `change` + terms, and `move` + `{from, to}`', () => {

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


    it('they move an Edit-Term left / right, cyclingly, keep input focused; ' +
       'update Term positions, and emit `change`', cb => {

      var origTerms = [{ str: 'a' }, { }, { str: 'b' }, { type: 'EL'}];
      var lastOrder = [0, 1, 2, 3];
      var moveNr = 0;
      make({ origTerms });

      // Arg. `termNr` always refers to a term-pos. in `origTerms`, even though
      // that term gets moved around between tests. - For ease of understanding.
      function testCase(termNr, arrow, newOrder, cb) {
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
          cb();
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
                            testCase(3, 'U', [0, 1, 2, 3], () =>
                              cb() )))) )) )))) ));
    });
  });



  describe('User-interaction: entering terms', () => {

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


    it('Enter after editing an existing R-Term: keeps its original `parentID` ' +
       'and `classID`; i.e. editing only changes an R-Term\'s label', cb => {
      make({ origTerms: [
        { str: 'aa', classID: 'A:01', instID: null, parentID: 'x:123' }] });
      vueTick(() => {
        _termIsTypeR(0);
        _termDblclick(0);
        vueTick(() => {
          _setInput(0, 'aaB');
          _termITrigEnter(0);
          _termIsTypeR(0);
          _emitV(0, 'change').should.deep.equal([{ type: 'ER' }]);
          _emitV(1, 'change').should.deep.equal([
            { str: 'aaB', classID: 'A:01', instID: null, parentID: 'x:123' }]);
          cb();
        });
      });
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


    it('Enter on a refTerm list-item creates an R-type Term', cb => {
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
      var advSrch = (settings, cb) => cb({ str: settings.str, id: 'ID5' });
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
        advancedSearch
      });
      vueTick(() => {
        _setInput(0, 'aabbc');
        vueTick(() => {
          _termITrigEnter(0);
        });
      });
      function advancedSearch (settings, cbf) {
        settings.str           .should     .equal('aabbc');
        settings.termType      .should     .equal('C');
        settings.vsmDictionary .should     .equal(dict);
        settings.queryOptions  .should.deep.equal(queryOptions);
        settings.allowClassNull.should     .equal(false);
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
      function advancedSearch (settings, cbf) {
        settings.queryOptions.should.deep.equal({
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
        function advancedSearch (settings, cbf2) {
          settings.str           .should     .equal(str);
          settings.termType      .should     .equal(type.replace('E', ''));
          settings.vsmDictionary .should     .equal(dict);
          settings.queryOptions  .should.deep.equal(queryOptions);
          settings.allowClassNull.should     .equal(false);
          cbf2(false);
          cbf();
        }
      }
      testCase(              'ER', 'abcd', () =>
        testCase(            'EI', 'abcd', () =>
          testCase(          'EC', 'abcd', () =>
            testCase(        'EL', 'abcd', () =>
              testCase(      'ER', '',     () =>
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
        advancedSearch: (settings, cbf) => cbf({ str: 'Q', id: 'A1' })
      });
      vueTick(() => {
        _termITrigSEnter(1);  // Launch `advancedSearch()` on the endTerm.
        vueTick(() => {
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
        });
      });
    });
  });



  describe('Handling of `advancedSearch()` return values', () => {

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
          advancedSearch: (settings, cbf) => cbf(false)
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
            advancedSearch: (settings, cbf2) => cbf2({ str: 'test', id: null })
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


    it('`termType` (R/I/C/L) determines the created Term\'s type, ' +
       'for any `id` (null, empty, or truthy)', cb => {
      function testCase(termType, id, cbf) {
        prep(
          { origTerms: [{ }],
            allowClassNull: true,
            advancedSearch: (settings, cbf2) => cbf2({ str: 'xy', id, termType })
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
            advancedSearch: (settings, cbf2) => cbf2({ termType: 'R', str: 'xy',
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
            advancedSearch: (settings, cbf2) => cbf2({ str: 'xy', id: '' })
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
        advancedSearch: (settings, cbf) => cbf({ str: 'xy', id: '' })
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
          advancedSearch: (settings, cbf2) => cbf2({ str: 'xy', id: 'ID3' })
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
          advancedSearch: (settings, cbf2) => cbf2(
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


    it('`dictID/descr` are copied to I/C-Terms, but not to R/L-Terms ' +
       '(when converted to I-Term, dictID/descr do not appear)', cb => {
      function testCase(termType, cbf) {
        make({
          origTerms: [{ }],
          advancedSearch: (settings, cbf2) => cbf2(
            { termType, str: 'xy', dictID: 'D1', descr: 'abc' })
        });
        vueTick(() => {
          _termITrigSEnter(0);
          vueTick(() => {
            var term = _emitV(0, 'change')[0];
            if (termType == 'I' || termType == 'C') {
              term.dictID.should.equal('D1');
              term.descr .should.equal('abc');
            }
            else {  // Else: termType is 'L' or 'R'.
              expect(term.dictID).to.equal(undefined);
              expect(term.descr ).to.equal(undefined);

              if (termType == 'L')  _termCClick(0);  // Change type: L -> R.
              _termCClick(0);                        // Change type: R -> I.
              term = _emitV(termType == 'L' ? 2 : 1, 'change')[0];
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



  describe('User-interaction: mouse-dragging of Terms', () => {

  });

});
