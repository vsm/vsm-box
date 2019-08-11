import Term from './Term.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/Term', () => {

  var w;  // Each test will assign its created Term component to this variable.

  const dict = new VsmDictionaryLocal({
    dictData: [
      { id: 'A', name: 'Aaa', entries: [
        { id: 'A:01', dictID: 'A', terms: [{ str: 'aaa', descr: 'abcde' }] },
        { id: 'A:02', dictID: 'A', terms: [{ str: 'FT' }] }
      ]}
    ],
    refTerms: ['it']
  });

  const Max = Number.MAX_VALUE;

  const qoFT = {idts: [{id: 'A:02'}]};  // `queryOptions` to include 1 fixedTerm.
  before(cb => dict.loadFixedTerms(qoFT.idts, {}, cb));  // Pre-load fixedTerms.

  const make = (props, wait = 10) => {
    // In order to not have to add Term-coordinates/dimensions to each test,
    // here we add some (overridable) default ones.
    props.term = Object.assign(
      { str: '', width: 20, height: 10, x:2, y:10 }, // Default, required values.
      props.term
    );
    // Simulate the fact that the external class fills in `label` based on `str`.
    if (props.term.label === undefined)  props.term.label = props.term.str;

    w = mount(Term, {
      propsData: Object.assign(
        { index:            55,
          vsmDictionary:    dict,
          maxStringLengths: {str: Max, strAndDescr: Max},
          freshListDelay:   0,
        },
        props
      )
    });

    if (wait)  clock.tick(wait);  // Jump past the initial nofade-setTimeout().
  };


  var clock; // For using fake timers. See description @VsmAutocomplete.test.js.
  beforeEach(() => clock = sinon.useFakeTimers());
  afterEach (() => clock.restore());


  /**
   * Gets (a wrapper for) the Term's input element, if it has any.  This is easy
   * because both VsmAutocomplete and a plain <input> (for EL/ER-type Terms)
   * set the same CSS-class `.input` on their <input> HTML-element.
   */
  const _input = () => w.find('input.input');

  const _setInput = newValue => {  // Changes the content of TheInput.
    var input = _input();
    input.element.value = newValue;
    input.trigger('input');
    clock.tick(10); // Wait until VsmAutocomplete receives all data & opens list.
  };

  const _itrigger = (...event) => { _input().trigger(...event); clock.tick(10) };
  const _ifocus = () => _itrigger('focus');

  const _wtrigger = (...event) => { w.trigger(...event);  clock.tick(10) };


  // Returns true/false if `str` was `$emit()`ted at least `index+1` times.
  const _emit = (index = 0, str = '-') => {
    var emit = w.emitted(str);
    return emit !== undefined  &&  emit[index] !== undefined;
  };

  // Returns `false` if `str` emitted less than `index+1` times; or else
  // the list of values for `strs`'s `index`'th emit.
  const _emitL = (index = 0, str = '-') => {
    return _emit(index, str) ? w.emitted(str)[index] : false;
  };

  // Same as `_emitL()`, but returns just the 1st value associated with the emit.
  const _emitV = (index = 0, str = '-') => {
    return _emit(index, str) ? w.emitted(str)[index][0] : false;
  };


  const vueTick = cb => Vue.nextTick(() => { clock.tick(10);  cb() });
  const DE = () => D(w.emittedByOrder());  // eslint-disable-line no-unused-vars


  const allTypes = ['I', 'C', 'L', 'R', 'EI', 'EC', 'EL', 'ER'];



  it('initializes, when getting only the required props', () => {
    make({
      term:             { width: 20, height: 10, x: 2, y:10 },
      index:            123,
      vsmDictionary:    dict,
      maxStringLengths: {str: 100, strAndDescr: 200}
      /// freshListDelay: 0,
      /// autofocus: false,
      /// placeholder: false,
      /// customItemLiteral: false,
    });
    w.isVueInstance().should.equal(true);
    ///H(w);
  });


  describe('handles props on a Term component', () => {

    it('correctly renders a `term` of type Editable-Instance', () => {
      /* Note: `type` is set by TheTerms, and is used to determine a CSS-class.
         (The str/classID/instID/parentID fields that are set in the other tests
         don't actually matter, under the current implementation of 'Term.js').
         The only exceptions are `type`s EC/EI/ER though, which _must_ be set.
      */
      make({ term: { type: 'EI' } });
      w.text().should.equal('');
      w.classes().should.have.members(['term', 'edit']);  // Note: no 'inst'.
    });

    it('correctly renders a `term` of type Editable-Class', () => {
      make({ term: { type: 'EC' } });
      w.text().should.equal('');
      w.classes().should.have.members(['term', 'edit', 'class']);
    });

    it('correctly renders a `term` of type Editable-Literal', () => {
      make({ term: { type: 'EL' } });
      w.text().should.equal('');
      w.classes().should.have.members(['term', 'edit', 'lit']);
    });

    it('correctly renders a `term` of type Editable-Referring', () => {
      make({ term: { type: 'ER' } });
      w.text().should.equal('');
      w.classes().should.have.members(['term', 'edit', 'ref']);  // No 'inst'.
    });

    it('correctly renders a `term` of type Literal', () => {
      make({ term: { type: 'L', str: 'abc' } });
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'lit']);
    });

    it('correctly renders a `term` of type Class', () => {
      make({ term: { type: 'C', str: 'abc', classID: 'A:01' } });
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'class']);
    });

    it('correctly renders a `term` of type Instance', () => {
      make({ term: { type: 'I', str: 'abc', classID: 'A:01', instID: null } });
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'inst']);
    });

    it('correctly renders a `term` of type Referring instance', () => {
      make( { term:
        { type: 'R', str: 'abc', classID: 'A:01', instID: null, parentID: null }
      });
      w.text().should.equal('abc');
      // Note: non-Edit Referring Term has 'ref' & 'inst', because: similar CSS.
      w.classes().should.have.members(['term', 'inst', 'ref']);
    });

    it('set an extra CSS-class on a focal (=head) term', () => {
      make( { term:
        { type: 'I', str: 'abc', classID: 'A:01', instID: null, isFocal: true }
      });
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'inst', 'focal']);
    });

    it('sets a temporary \'nofade\' CSS-class at Term creation, or when ' +
       'changing prop `term`, or changing any `term` subproperty', () => {
      function test() {
        w.classes().should    .contain('nofade');
        clock.tick(10);
        w.classes().should.not.contain('nofade');
      }
      make(
        { term: { type: 'I', str: 'abc', classID: 'A:01', instID: 'x12' } },
        0  // Do not skip the nofade-timeout as is done in all other tests.
      );
      test();  // After creation.
      w.setProps({ term: { type: 'C', str: 'abc', classID: 'A:01', x:0, y:0 } });
      test();  // After `term` change.
      w.vm.term.type = 'L';
      test();  // After `term.type` change.
      w.vm.term.x++;
      test();  // After `term.x` change.
    });

    it('works when there are optional properties in the `term`-prop ' +
       'Object', () => {
      make({ term: {
        type: 'R',
        str: 'abc', classID: 'A:01', instID: 'myDB:1123', parentID: 'myDB:1105',
        isFocal: true, style: 'i', dictID: 'A', descr: 'descr-xyz'
      } });
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'inst', 'ref', 'focal']);
    });

    it('shows the styled, HTML-based `term.label` rather than `term.str` ' +
       'if it is given', () => {
      make({ term: { str: 'abc', style: 'i', label: '<i>abc</i>' } });
      w.html().should.contain('<i>abc</i>');
    });


    it('shows `term.placeholder` as the label, and adds \'label-placehold\' ' +
       'CSS-class, only if `term.label` is empty, for an Edit-type term ' +
        'that does not have the <input>', () => {
      const _label = () => w.find('.label');

      make({ term: { placeholder: 'P', str: '', type: 'EL' }, hasInput: false });
      _label().text().should.equal('P');
      _label().classes().should    .include('label-placehold');

      make({ term: { placeholder: 'P', str: 'a', type: 'EL' }, hasInput: false});
      _label().text().should.equal('a');
      _label().classes().should.not.include('label-placehold');

      make({ term: { placeholder: 'P', str: '', type: 'L' }, hasInput: false });
      _label().text().should.equal('');
      _label().classes().should.not.include('label-placehold');

      make({ term: { placeholder: 'P', str: '', type: 'EL' }, hasInput: true });
      _label().exists().should.equal(false);
    });


    it('makes plain-input placeholder like vsmAC\'s: with \'placehold\'-elem' +
       'that changes style on focus, and hides when input has text', () => {
      const make2 = term =>
        make({ term: Object.assign(term, { type: 'EL' }), hasInput: true });
      const _placeh = () => w.find('.placehold');

      // (Similar to a number of tests at vsm-autocomplete's TheInput) :
      // 1. Gives placehold a 'focus' class on focus; removes it on blur.
      make2({ placeholder: 'plc', str: '' });
      _placeh().classes().should.not.contain('focus');
      _input ().trigger('focus');
      _placeh().classes().should    .contain('focus');
      _input ().trigger('blur');
      _placeh().classes().should.not.contain('focus');

      // 2. Gives it a 'hidden' class, only if `placeholder` and `str` are given.
      make2({ placeholder: 'plc', str: '' });
      _placeh().classes().should.not.contain('hidden');
      make2({ placeholder: 'plc', str: 'a' });
      _placeh().classes().should    .contain('hidden');

      // 3. Does not add it if no `placeholder` is given.
      make2({ placeholder: ''   , str: '' });
      _placeh().exists().should.equal(false);
      make2({ placeholder: false, str: '' });
      _placeh().exists().should.equal(false);

      // 4. Gives it a 'hidden' class, only if the input is not empty.
      //    (Test-implem. differs from in vsmAC, as Term does not use v-model).
      var term = { placeholder: 'plc', str: '', type: 'EL' };
      make({ term, hasInput: true });
      w.setProps({ term: Object.assign({}, term, { str : 'a' }) });
      _placeh().classes().should    .contain('hidden');
      w.setProps({ term: Object.assign({}, term, { str : '' }) });
      _placeh().classes().should.not.contain('hidden');

      // 5. Changes its content along with the `placeholder` prop.
      term = { placeholder: 'plc', str: '', type: 'EL' };
      make({ term, hasInput: true });
      w.setProps({ term: Object.assign({}, term, { placeholder: 'plc2' }) });
      _placeh().text().should.equal('plc2');
    });


    it('shows placeholder both given as `placeholder` (for endTerm), and as ' +
       '`term.placeholder` (for other Terms)', () => {
      make({ term: { str: '', type: 'ER', placeholder: 'P' }, hasInput: true });
      w.find('.placehold').text().should.equal('P');

      make({ term: { str: '', type: 'ER' }, placeholder: 'P', hasInput: true });
      w.find('.placehold').text().should.equal('P');
    });


    it('updates rendering when the `term` prop changes', () => {
      make({ term: {
        type: 'R', str: 'abc', label: 'abc',
        classID: 'A:01', instID: null, parentID: null, isFocal: true
      }});
      w.text().should.equal('abc');
      w.classes().should.have.members(['term', 'inst', 'ref', 'focal']);

      w.setProps({ term: {
        type: 'C', str: 'def', label: 'def',
        classID: 'B:02'
      }});
      w.text().should.equal('def');
      w.classes().should.have.members(['term', 'class', 'nofade']); // W. nofade.
      clock.tick(10);
      w.classes().should.have.members(['term', 'class']);    // Without 'nofade'.
    });


    it('passes `term.queryOptions` on to <vsm-autocomplete>', () => {
      make({ term: { type: 'EI', queryOptions: qoFT }, hasInput: true });

      // Focus VsmAC, so it launches a query. + Add fake delay to await results.
      _ifocus();

      // If `queryOptions` was passed on correctly, then a matches-list will now
      // be shown, showing the single fixedTerm-match.
      w.find('.list').exists().should.equal(true);

      // Extra: test of our test-setup: without fixedTerm, the list stays closed.
      make({ term: { type: 'EI' }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(false);
    });


    it('passes a combined `queryOptions` and `term.queryOptions` on to ' +
       '<vsm-autocomplete>, with term\'s taking priority', () => {
      const test = (itemCount, props) => {
        make( Object.assign(props, {
          vsmDictionary: new VsmDictionaryLocal({ dictData: [
            { id: 'A', name: 'Aaa', entries: [
              { id: 'A:01', dictID: 'A', terms: [{ str: 'a' }] },
              { id: 'A:02', dictID: 'A', terms: [{ str: 'a' }] },
              { id: 'A:03', dictID: 'A', terms: [{ str: 'a' }] }
            ]}
          ]}),
          hasInput: true
        }));
        _ifocus();
        w.findAll('.list .item-part-str').length.should.equal(itemCount);
      };

      test(3, { term: { type: 'EI', str: 'a' } } );
      test(2, { term: { type: 'EI', str: 'a', queryOptions: { perPage: 2 } } });
      test(2, { term: { type: 'EI', str: 'a' },  queryOptions: { perPage: 2 } });
      test(1, {
        term: { type: 'EI', str: 'a', queryOptions: { perPage: 1 } }, // <--- =1.
        queryOptions: { perPage: 2 }
      });
      test(2, {
        term: { type: 'EI', str: 'a', queryOptions: { perPage: 2 } }, // <--- =2.
        queryOptions: { perPage: 1 }
      });
    });


    it('uses `term.str` as initial value in both <vsm-autocomplete> ' +
       'and a plain input (Term type EL/ER)', () => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      _input().element.value.should.equal('a');

      make({ term: { type: 'EL', str: 'a' }, hasInput: true });
      _input().element.value.should.equal('a');
    });


    it('updates input value when `term.str` changes, for both ' +
       '<vsm-autocomplete> and a plain input', () => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      _input().element.value.should.equal('a');
      w.setProps({ term: { type: 'EI', str: 'bb' } });
      _input().element.value.should.equal('bb');

      make({ term: { type: 'EL', str: 'a' }, hasInput: true });
      _input().element.value.should.equal('a');
      w.setProps({ term: { type: 'EL', str: 'bb' } });
      _input().element.value.should.equal('bb');
    });


    it('passes `autofocus` and `placeholder` on to both <vsm-autocomplete> ' +
       'and a plain input', () => {
      const _placehold = () => w.find('.placehold');

      // Part 1: for autocomplete input.
      make({
        term: { type: 'EI' }, hasInput: true,
        autofocus: true, placeholder: 'abc'
      });
      _input().attributes().autofocus.should.not.equal(undefined);
      _placehold().text()            .should    .equal  ('abc');
      _placehold().classes()         .should.not.include('hidden');

      // Part 2: for plain input.
      make({
        term: { type: 'EL' }, hasInput: true,
        autofocus: true, placeholder: 'abc'
      });
      _input().attributes().autofocus.should.not.equal(undefined);
      _placehold().text()            .should    .equal  ('abc');
      _placehold().classes()         .should.not.include('hidden');

      // Part 3: both input types do not set these attributes when not asked to.
      make({ term: { type: 'EI' }, hasInput: true });
      expect(_input().attributes().autofocus  ).to.equal(undefined);
      _placehold().exists().should.equal(false);

      make({ term: { type: 'EL' }, hasInput: true });
      expect(_input().attributes().autofocus  ).to.equal(undefined);
      _placehold().exists().should.equal(false);
    });


    it('passes `maxStringLengths` on to <vsm-autocomplete>', () => {
      make({
        term: { type: 'EI' },  hasInput: true,
        maxStringLengths: { str: 2, strAndDescr: 5 }
      });
      _setInput('a');
      _ifocus();
      w.find('.list').exists().should.equal(true);
      w.find('.list .item-part-str'  ).text().length.should.equal(2);
      w.find('.list .item-part-descr').text().replace(/[()]/g, '')
        .length.should.equal(3);  // Length without enclosing parentheses.
    });


    it('passes `freshListDelay` on to <vsm-autocomplete>', () => {
      make({ term: { type: 'EI' },  hasInput: true,  freshListDelay: 1000 });
      _setInput('a');
      _ifocus();
      w.find('.list').exists().should.equal(true);
      clock.tick(979);  // (999 minus some `clock.tick(10)`/etcs).
      w.find('.list .item').trigger('click.left');
      w.find('.list').exists().should.equal(true);
      clock.tick(21);
      w.find('.list .item').trigger('click.left');
      w.find('.list').exists().should.equal(false);
    });


    it('passes `customItemLiteral` on to <vsm-autocomplete>', () => {
      make({
        term: { type: 'EI' },  hasInput: true,
        customItemLiteral: data => {
          data.strs.strTitle = 'test';
          data.strs.str = `Test: ${ data.strs.str } ▸▸▸`;
          return data.strs;
        }
      });
      _setInput('abc');
      _ifocus();
      var html = w.find('.item-type-literal').html();
      html.should.contain(' title="test"');
      html.should.contain('>Test: abc ▸▸▸<');
    });
  });



  describe('sends emit events for user-actions on all Term-types', () => {

    it('emits `key-esc`+index for all 4 Edit-type Terms (EI/EC/EL/ER), i.e. ' +
       'for a plain <input> and VsmAutocomplete (with closed items-list)', () => {
      make({
        term: { type: 'EI' },
        index: 55,  // This is also the default value that is used in all Tests.
        hasInput: true
      });
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(55);  // The emit includes Term's index.
      _emit (1, 'key-esc').should.equal(false);  // Only 1 emit.

      make({ term: { type: 'EC' }, hasInput: true });
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(55);

      make({ term: { type: 'EL' }, hasInput: true });
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(55);

      make({ term: { type: 'ER' }, hasInput: true });
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(55);
    });


    it('does not emit `key-esc` for EI/EC-type Terms with opened ' +
       'matching-items list', () => {
      make({ term: { type: 'EI' }, hasInput: true });
      _setInput('it');  // Matches a ref-term, so the matching-items list opens.
      w.find('.list').exists().should.equal(true);

      _itrigger('keydown.esc');  // First Esc only closes the matches-list.
      w.find('.list').exists().should.equal(false);
      _emitV(0, 'key-esc').should.equal(false);  // No emit yet.

      _itrigger('keydown.esc');  // Second Esc emits.
      _emitV(0, 'key-esc').should.equal(55);  // It emitted.

      // Part 2: run the same tests for Term-type 'EC'.
      make({ term: {type: 'EC'}, hasInput: true });
      _setInput('it');
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(false);
      _itrigger('keydown.esc');
      _emitV(0, 'key-esc').should.equal(55);
    });


    it('does not emit `key-bksp` on Backspace on a filled plain-input', () => {
      make({ term: { type: 'EL' }, hasInput: true });
      _setInput('aaa');
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(false);
    });


    it('does not emit `key-bksp` on Backspace on a filled vsmAC-input', () => {
      make({ term: { type: 'EI' }, hasInput: true }); // Has VsmAutocomplete.
      _setInput('aaa');
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(false);
    });


    it('does not emit `key-bksp` on a whitespace-only plain-input, '+
       'with cursor not at start of the input', () => {
      make({ term: { type: 'EL' }, hasInput: true });
      _setInput('  ');
      _input().element.selectionStart = 1;  // } Put cursor in the middle of..
      _input().element.selectionEnd   = 1;  // } ..the input.
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(false);
    });


    it('does not emit `key-bksp` on a whitespace-only vsmAC-input, '+
       'with cursor not at start of the input', () => {
      make({ term: { type: 'EI' }, hasInput: true });
      _setInput('  ');
      _input().element.selectionStart = 1;
      _input().element.selectionEnd   = 1;
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(false);
    });


    it('emits `key-bksp`+index on a whitespace-only plain-input, with cursor ' +
       'at start of input; empties input; emits `input`', () => {
      make({ term: { type: 'EL' }, hasInput: true });
      _setInput('  ');
      _input().element.selectionStart = 0;  // } Put cursor at start of..
      _input().element.selectionEnd   = 0;  // } ..the input.
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(55);
      _input().element.value.should.equal('');
      _emitL(1, 'input').should.deep.equal([55, '  ']);
      _emitL(2, 'input').should.deep.equal([55, '']);
    });


    it('emits `key-bksp`+index on a whitespace-only vsmAC-input, with cursor ' +
       'at start of input; empties input; and closes any open list', () => {
      // Make an empty/whitespace-input show a list with 1 match, for this Term.
      make({ term: { type: 'EI', queryOptions: qoFT }, hasInput: true });
      _setInput('  ');
      _ifocus();  // VsmAC queries when it gets the focus.  + Add fake delay.
      w.find('.list').exists().should.equal(true);  // Matches-list is now shown.

      _input().element.selectionStart = 0;  // } Put cursor at start of..
      _input().element.selectionEnd   = 0;  // } ..the input.
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(55);        // Emitted.
      _input().element.value.should.equal('');       // Emptied the input.
      w.find('.list').exists().should.equal(false);  // Closed the list.
    });


    it('emits `key-bksp`+index on an empty plain-input', () => {
      make({ term: { type: 'EL' }, hasInput: true });
      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(55);
    });


    it('emits `key-bksp`+index on an empty vsmAC-input, and closes an open ' +
       'matches-list', () => {
      make({ term: { type: 'EI', queryOptions: qoFT }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(true);

      _itrigger('keydown.backspace');
      _emitV(0, 'key-bksp').should.equal(55);        // Emitted.
      w.find('.list').exists().should.equal(false);  // Closed the list.
    });


    it('emits `key-ctrl-enter`+index, for both plain and vsmAC-input (when it ' +
       'contains no string-code', () => {
      function testCase(type, str, result) {
        make({ term: { type, str }, hasInput: true });
        _itrigger('keydown.enter', { ctrlKey: true });
        _emitV(0, 'key-ctrl-enter').should.equal(result);
      }
      testCase('EI', '', 55);   // Emits both for empty..
      testCase('EL', '', 55);
      testCase('EI', 'a', 55);  // ..and for non-empty input.
      testCase('EL', 'a', 55);
    });


    it('emits `key-tab`+index+\'\'/\'shift\', for both plain and ' +
       'vsmAC-input', () => {
      function testCase(type, shiftKey, str) {
        make({ term: { type }, hasInput: true });
        _itrigger('keydown.tab', shiftKey ? { shiftKey } : undefined);
        _emitL(0, 'key-tab').should.deep.equal([55, str]);
      }
      testCase('EI', false, '');
      testCase('EL', false, '');
      testCase('EI', true, 'shift');
      testCase('EL', true, 'shift');
    });


    it('emits `key-alt-up/down`+index, for both plain and ' +
       'vsmAC-input', () => {
      function testCase(type, arrow) {
        make({ term: { type }, hasInput: true });
        _itrigger('keydown.' + arrow, { altKey: true });
        _emitV(0, 'key-alt-' + arrow).should.equal(55);
      }
      testCase('EI', 'up');
      testCase('EL', 'up');
      testCase('EI', 'down');
      testCase('EL', 'down');
    });


    it('emits `key-ctrl-delete`+index, for both plain and ' +
       'vsmAC-input, both filled and empty', () => {
      function testCase(type, str) {
        var term = { type };
        if (str)  term.str = str;
        make({ term, hasInput: true });
        _itrigger('keydown.delete', { ctrlKey: true });
        _emitV(0, 'key-ctrl-delete').should.equal(55);
      }
      testCase('ER');  testCase('ER', 'aaa');
      testCase('EI');  testCase('EI', 'aaa');
      testCase('EC');  testCase('EC', 'aaa');
      testCase('EL');  testCase('EL', 'aaa');
    });


    it('emits `key-ctrl-bksp`+index, for both plain and ' +
       'vsmAC-input, but only if empty or only-whitespace', () => {
      function testCase(type, str, result) {
        var term = { type };
        if (str)  term.str = str;
        make({ term, hasInput: true });
        _input().element.selectionStart = str.length;
        _input().element.selectionEnd   = str.length;
        _itrigger('keydown.backspace', { ctrlKey: true });
        _emitV(0, 'key-ctrl-bksp').should.equal(result ? 55 : false);
      }
      testCase('ER', '', 1);  testCase('ER', ' ' , 1);  testCase('ER', 'aa', 0);
      testCase('EI', '', 1);  testCase('EI', '\n', 1);  testCase('EI', 'aa', 0);
      testCase('EC', '', 1);  testCase('EC', '\t', 1);  testCase('EC', 'aa', 0);
      testCase('EL', '', 1);  testCase('EL', '  ', 1);  testCase('EL', 'aa', 0);
    });


    it('Ctrl+Bksp empties non-empty input, only if cursor at start', () => {
      function testCase(type, cursorPos, emptied) {
        var term = { type };
        term.str = 'aaa';
        make({ term, hasInput: true });
        _input().element.selectionStart = cursorPos;
        _input().element.selectionEnd   = cursorPos;
        _itrigger('keydown.backspace', { ctrlKey: true });
        if (emptied)  _emitL(1, 'input')[1].should.equal('');
        else          _emitV(1, 'input')   .should.equal(false);
        _emitV(0, 'key-ctrl-bksp').should.equal(false);  // No other emit.
      }
      testCase('ER', 3, false);  testCase('ER', 0, true);
      testCase('EI', 3, false);  testCase('EI', 0, true);
      testCase('EC', 3, false);  testCase('EC', 0, true);
      testCase('EL', 3, false);  testCase('EL', 0, true);
    });


    it('emits `key-shift-enter`+index, for both plain and ' +
       'vsmAC-input, both filled and empty', () => {
      function testCase(type, str) {
        var term = { type };
        if (str)  term.str = str;
        make({ term, hasInput: true });
        _itrigger('keydown.enter', { shiftKey: true });
        _emitV(0, 'key-shift-enter').should.equal(55);
      }
      testCase('ER');  testCase('ER', 'aaa');
      testCase('EI');  testCase('EI', 'aaa');
      testCase('EC');  testCase('EC', 'aaa');
      testCase('EL');  testCase('EL', 'aaa');
    });


    it('emits `input`+index+str, for both plain and ' +
       'vsmAC-input, also at initialization', () => {
      function testCase(type) {
        make({ term: { str: 'aa', type }, hasInput: true });
        _emitL(0, 'input').should.deep.equal([55, 'aa']);
        _setInput('bb');
        _emitL(1, 'input').should.deep.equal([55, 'bb']);
      }
      testCase('EI');
      testCase('EL');
    });


    it('emits `input`+index+str, for both plain and ' +
       'vsmAC-input, also when changing type', cb => {
      function testCase(type, type2, cbf) {
        make({ term: { str: 'aa', type }, hasInput: true });
        w.setProps({ term: { str: 'bb', type: type2 } });
        vueTick(() => {
          _setInput('cc');
          vueTick(() => {
            _emitL(0, 'input').should.deep.equal([55, 'aa']);
            _emitL(1, 'input').should.deep.equal([55, 'bb']);
            _emitL(2, 'input').should.deep.equal([55, 'cc']);
            cbf();
          });
        });
      }
      testCase('EC', 'EL', () =>
        testCase('ER', 'EI', cb) );
    });


    it('emits `focus`+index, for both plain and vsmAC-input', () => {
      function testCase(type) {
        make({ term: { type }, hasInput: true });
        _itrigger('focus');
        _emitV(0, 'focus').should.equal(55);
      }
      testCase('EI');
      testCase('EL');
    });


    it('emits `blur`+index, for both plain and vsmAC-input', () => {
      function testCase(type) {
        make({ term: { type }, hasInput: true });
        _itrigger('blur');
        _emitV(0, 'blur').should.equal(55);
      }
      testCase('EI');
      testCase('EL');
    });


    it('emits `list-open`+index, for vsmAC-input', () => {
      make({ term: { type: 'EI', queryOptions: qoFT }, hasInput: true });
      _ifocus();  // On focus + a delay, the matches-list will show a fixedTerm.
      w.find('.list').exists().should.equal(true);
      _emitV(0, 'focus').should.equal(55);
    });


    it('emits `item-select`+matchObject, for vsmAC-input', () => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(true);
      _itrigger('keydown.enter');
      var list = _emitL(0, 'item-select');
      list[0]   .should.equal(55);
      list[1].id.should.equal('A:01');  // `id` of the emitted match-object.
    });


    it('emits `item-literal+select`, for vsmAC-input', () => {
      make({ term: { type: 'EI', str: 'Q' }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(true);  // It shows the item-literal.
      _itrigger('keydown.enter');
      _emitV(0, 'item-literal-select').should.deep.equal(55);
    });


    it('emits `plain-enter`, for plain-input', () => {
      make({ term: { type: 'EL', str: 'Q' }, hasInput: true });
      _itrigger('keydown.enter');
      _emitV(0, 'plain-enter').should.deep.equal(55);
    });


    it('emits a single `mouseenter/-leave/-down/click/dblclick/ctrl-/ctrl-' +
       'shift-/alt-mousedown`+index: for all 8 Term-types [=64 tests]', () => {
      function testCase(type, eventOut, ...eventInArgs) {
        make({ term: { type }, hasInput: type.startsWith('E') });
        _wtrigger(...(eventInArgs.length ? eventInArgs : [eventOut]));
        _emitV(0, eventOut).should.equal(55);
        _emitV(1, eventOut).should.equal(false);  // No second emit.

        // Some should have an `event` object as second emit-arg.
        if (['mousedown', 'ctrl-shift-mousedown'].includes(eventOut)) {
          ( typeof _emitL(0, eventOut)[1] ).should.equal('object');
        }
      }

      // Note: `mouseover` is used to detect mouse-hover (not mouseenter),
      // because it gives fine-grained control that allows
      // to ignore hover-events on a vsm-autocomplete's matches-list
      // (as such hover-events should not keep a ThePopup visible).
      allTypes.forEach(t => testCase(t, 'mouseenter',     'mouseover'));

      allTypes.forEach(t => testCase(t, 'mouseleave'));
      allTypes.forEach(t => testCase(t, 'mousedown',      'mousedown.left'));
      allTypes.forEach(t => testCase(t, 'click',          'click.left'));
      allTypes.forEach(t => testCase(t, 'dblclick',       'dblclick.left'));
      allTypes.forEach(t => testCase(t, 'ctrl-mousedown', 'mousedown.left',
        { ctrlKey: true }));
      allTypes.forEach(t => testCase(t, 'ctrl-shift-mousedown', 'mousedown.left',
        { ctrlKey: true, shiftKey: true }));
      allTypes.forEach(t => testCase(t, 'alt-mousedown',  'mousedown.left',
        { altKey: true }));
    });


    it('emits a single `mousedown/click/dblclick`+index, for that event ' +
       '*inside* both plain and vsmAC-input', () => {
      // Note: a previous test only included tests for mousedown/click on a Term,
      //       *outside* its <input> (if it has any), i.e.: only on the Term's
      //       padding, border, or (bubbled-up from) any text-content.
      function testCase(type, eventStr) {
        make({ term: { type }, hasInput: true });
        _itrigger(eventStr + '.left');
        _emitV(0, eventStr).should.equal(55);
        _emitV(1, eventStr).should.equal(false);  // No second emit.
      }
      ['mousedown', 'click', 'dblclick'].forEach(eventStr =>
        ['EI', 'EL'].forEach(type => testCase(type, eventStr)));
    });


    it('emits a single `mousedown/click/dblclick`+index, for that event ' +
       'on a Term\'s *label*', () => {
      function testCase(type, eventStr) {
        make({ term: { str: 'abc', type } });
        w.find('.label').trigger(eventStr + '.left');
        _emitV(0, eventStr).should.equal(55);
        _emitV(1, eventStr).should.equal(false);  // No second emit.
      }
      ['mousedown', 'click', 'dblclick'].forEach(eventStr =>
        allTypes.forEach(type => testCase(type, eventStr)));
    });


    it('focuses the input, on `mousedown` outside both a plain ' +
       'or vsmAC-input', () => {
      const inputHasFocus = () => _input().element === document.activeElement;

      function testCase(type) {
        make({ term: { type }, hasInput: true });
        inputHasFocus().should.equal(false);  // (Just a test of our test setup).
        _wtrigger('mousedown.left');
        inputHasFocus().should.equal(true);
      }

      ['EI', 'EL'].forEach(type => testCase(type));
    });
  });



  describe('various', () => {

    it('makes `click` on the border of a Term with vsmAC-input behave ' +
       'the same as on its vsmAC-input: it opens a closed matches-list', cb => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      w.find('.list').exists().should.equal(false);
      _wtrigger('click.left');
      vueTick(() => {
        w.find('.list').exists().should.equal(true);
        cb();
      });
    });


    it('after `click` on a vsmAC list-item, does not cause vsmAC to reopen ' +
       'its matches-list', cb => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(true);
      w.find('.list .item').trigger('click.left');
      vueTick(() => {
        w.find('.list').exists().should.equal(false);
        cb();
      });
    });


    it('makes `dblclick` on the border of a Term with vsmAC-input behave ' +
       'the same as on its vsmAC-input: it closes an open matches-list', cb => {
      make({ term: { type: 'EI', str: 'a' }, hasInput: true });
      _ifocus();
      w.find('.list').exists().should.equal(true);
      _wtrigger('dblclick.left');
      vueTick(() => {
        w.find('.list').exists().should.equal(false);
        cb();
      });
    });


    it('makes `dblclick` unselect text in the input, for both plain and ' +
       'vsmAC-input', () => {
      // Note: this feature counteracts the side-effect of selecting all text in
      // the input, when double-clicking to show the Edit-Term's ThePopup.
      function testCase(type) {
        make({ term: { type, str: 'aaa' }, hasInput: true });
        var el = _input().element;
        el.selectionStart = 1;
        el.selectionEnd   = 2;
        _itrigger('dblclick.left');
        el.selectionStart.should.equal(3);
        el.selectionEnd  .should.equal(3);
      }
      testCase('EI');
      testCase('EL');
    });
  });

});
