import VsmBox from './VsmBox.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
import cacher from 'vsm-dictionary-cacher';
// Some extra, global variables are defined in 'test-setup.js'.


describe('VsmBox', () => {

  // We first create a test-setup, after which we run the actual tests.
  // --> See also the comments in vsm-autcomplete's 'VsmAutocomplete.test.js'.



  // --- 1/5) CREATE A TEST-VsmDictionary ---

  const di1 = { id: 'A', name: 'Name 1' };
  const di2 = { id: 'B', name: 'Name 2' };
  const di3 = { id: 'C', name: 'Name 3' };

  const e1 = { id: 'A:01', dictID: 'A', terms: [{ str: 'a'   }] };
  const e2 = { id: 'A:02', dictID: 'A', terms: [{ str: 'ab'  }] };
  const e3 = { id: 'B:01', dictID: 'B', terms: [{ str: 'bc'  }] };
  const e4 = { id: 'B:02', dictID: 'B', terms: [{ str: 'bcd' }, { str: 'x' }],
    descr: 'Descr' };
  const e5 = { id: 'B:03', dictID: 'B', terms: [{ str: 'bcc' }] };
  const e6 = { id: 'C:01', dictID: 'C', terms: [{ str: 'xyz' }] };

  const r1 = 'it';
  const r2 = 'that';
  const r3 = 'this';

  const addEntries = (di, ...entries) => Object.assign({}, di, { entries });

  function makeDictionary(options = {}) {
    return new VsmDictionaryLocal(Object.assign({}, options, {
      dictData: [
        addEntries(di1, e1, e2),
        addEntries(di2, e3, e4, e5),
        addEntries(di3, e6)
      ],
      refTerms: [r1, r2, r3]
    }));
  }

  var dict = makeDictionary();  ///{ delay: 100 });



  // --- 2/5) FOR CREATING A TEST-VsmBox-COMPONENT ---

  // Each test will assign its `make()`d VsmBox component to `w`, that `_...()`
  // functions below can access, without needing it as an arg. for each call.
  var w;

  const sizes = {
  };

  // Each test uses `make()` to create a VsmBox test-component with custom props.
  const make = (props, listeners) => {
    w = mount(VsmBox, {
      propsData: Object.assign(
        { vsmDictionary: dict  // Add a default VsmDictionary (overridable).
        },
        props,                 // Insert test-specific props from the argument.
        { sizes: Object.assign({}, sizes, props.sizes) } // Use&override sizes.
      ),
      listeners: listeners || {  // Add a set of listeners, by default:
        'change':  o => o  ///D(`called with ${JSON.stringify(o)}.`),
      }
    });
  };



  // --- 3/5) UTILITY FUNCTIONALITY ---

  // Shorthand functions for repeatedly accessed HTML parts.
  /* eslint-disable no-unused-vars */
  const _input = () => w.find('input.input');

  // Shorthand functions to trigger user-generated events.
  const _itrigger = (...event) => { _input().trigger(...event); clock.tick(10) };
  const _ifocus = () => _itrigger('focus');

  // Shorthand functions to check if a certain event was emitted X times.
  // + Returns true/false if `str` was emitted at least `index+1` times.
  const _emit = (index = 0, str) => {
    var emit = w.emitted(str);
    return emit !== undefined  &&  emit[index] !== undefined;
  };
  // + Returns 0 if `str` emitted <`index+1` times; else `index`'th emitted val.
  const _emitV = (index = 0, str) => {
    var emit = w.emitted(str);
    return emit !== undefined && emit[index] !== undefined ? emit[index][0] : 0;
  };

  const _emitCh = index => _emitV(index, 'change');
  const _emitXy = index => _emit (index, 'xy');


  const vueTick = cb => Vue.nextTick(cb);  // Shorthand function.
  /* eslint-enable no-unused-vars */



  // --- 4/5) TIME TRAVEL SETUP ---

  var clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });



  // --- 5/5) THE TESTS ---

  // --- CAN NOT TEST THIS until the 'vue-test-utils'@beta..-framework
  //     gets fixed so it can handle our TheConns' `origConns`-watcher. ---
  describe.skip('VsmBox [awaiting vue-test-utils update]', () => {

    it('initializes without props', cb => {
      w = mount(VsmBox, { propsData: { } });
      w.isVueInstance().should.equal(true);

      vueTick(() => {
        _input().exists().should.equal(true);
        cb();
      });
    });


    it('initializes with an `initialValue` prop that has no `.terms/conns` ' +
       'properties', cb => {
      make({ initialValue: { } });
      vueTick(() => {
        _input().exists().should.equal(true);
        cb();
      });
    });


    it('passes a `placeholder` prop to an endTerm\'s input', cb => {
      make({ placeholder: 'abx' });
      vueTick(() => {
        w.findAll('.terms .term:not(.ruler)').at(0)
          .find('input.input').attributes().placeholder.should.equal('abx');
        cb();
      });
    });


    //// This would need 'TheTerms.test.js''s `getRuler()`-mock in order to work.
    //it('passes the `sizes` prop down to TheTerms', cb => {
    //  make({ initialValue: {terms: [{}]}, sizes: {defaultEditWidth: 10} });
    //  Vue.nextTick(() => {
    //    H(w);
    //    var term0 = w.findAll('.terms .term:not(.ruler):not(.term-end)').at(0);
    //    D(term0.attributes().style);
    //    cb();
    //  });
    //});

    //it('passes a `sizes` prop, with defaults added, down to TheTerms', () => {
    //});


    it('when TheTerms emits a `width` event, it sets that width on itself, ' +
       'and as an attribute on TheConns [shallow test]', () => {
      // Ideally, it should have a deep mounted TheTerms, with (somehow..?) the
      // mock-getRuler installed (see: TheTerms.test.js). --> Then this test can
      // listen to the emitted event, instead of calling `onTermsWidth`. --> And
      // then it can test that the '500' is set on the <svg> element.
      w = shallowMount(VsmBox, { propsData: {
        vsmDictionary: dict,
        initialValue: { terms: [{ str: 'aaa' }], conns: [] },
        sizes: { minWidth: 5, minEndTermWidth: 10 }
      }});
      vueTick(() => {
        w.vm.onTermsWidth(500);
        (!!w.attributes().style.match(/width:\s*500px/)).should.equal(true);
        w.find('.vsm-box the-conns-stub').attributes().width.should.equal('500');
      });
    });


    it('preloads fixedTerms found in `initialValue`, and preloads again ' +
       'after updating that prop, or the prop `vsmDictionary`', cb => {
      var calledWith = [];

      var dict2 = new VsmDictionaryLocal();
      var origFunc = dict2.loadFixedTerms.bind(dict2);
      dict2.loadFixedTerms = function(idts, options, cbf) {
        calledWith.push({ idts, options });
        origFunc(idts, options, cbf);
      };

      var terms1 = [
        { str: 'aaa' },
        { },
        { type: 'EC',
          queryOptions: {
            fixedTerms: [{ id: 'A:1', str: 'aa' }]
          }
        },
        {
          queryOptions: {
            fixedTerms: [{ id: 'B:1' }, { id: 'C:1', str: 'cc' }],
            z: ['x', 'y']
          }
        },
        { type: 'EL',
          queryOptions: {
            fixedTerms: [{ id: 'D:1', str: 'dd' }],
            z: true
          }
        }
      ];

      make({ vsmDictionary: dict2, initialValue: { terms: terms1, conns: [] } });
      vueTick(() => {
        calledWith.should.deep.equal([ // (Or some permutation of this, in fact).
          { idts: [{ id: 'A:1', str: 'aa' }, { id: 'D:1', str: 'dd' }],
            options: { z: true }
          },
          { idts: [{ id: 'B:1' }, { id: 'C:1', str: 'cc' }],
            options: { z: ['x', 'y'] }
          }
        ]);

        // Part 2: updating the `initialValue` prop makes it preload again.
        calledWith = [];
        var terms2 = [
          { str: 'xyz',
            queryOptions: {
              fixedTerms: [{ id: 'E:1', str: 'ee' }]
            }
          }
        ];
        w.vm.$forceUpdate();  // Because 'vue-test-utils@1.0.0-beta.28' does..
        //                    // ..not like the line `this.origConns = false;`.
        w.setProps({ initialValue: { terms: terms2, conns: [] } });
        calledWith.should.deep.equal([
          { idts: [{ id: 'E:1', str: 'ee' }],
            options: { z: true }
          }
        ]);

        // Part 3: updating the `vsmDictionary` prop makes it preload again too.
        var dict3 = new VsmDictionaryLocal();
        dict3.loadFixedTerms = (a, o, cbf) => { calledWith = ['ok'];  cbf() };
        calledWith = [];
        w.setProps({ vsmDictionary: dict3 });
        calledWith.should.deep.equal(['ok']);
        cb();
      });
    });


    it('preloads all dictInfos found in `initialValue`\'s Edit-Terms,' +
       'only if `vsmDictionary` is wrapped in vsm-dictionary-cacher', cb => {
      var calledWith;

      var dict2 = new (cacher(VsmDictionaryLocal)) ();  // Wrap it in a cacher.
      var origFunc = dict2.getDictInfos.bind(dict2);
      dict2.getDictInfos = function(options, cbf) {
        calledWith = options;
        origFunc(options, cbf);
      };

      var terms1 = [
        { str: 'aaa' },
        { },
        { type: 'EC',
          queryOptions: {
            filter: { dictID: ['A', 'B'] },
            sort:   { dictID: ['C'] }
          }
        },
        { type: 'EL',
          queryOptions: { z: ['x', 'y'] }
        },
        { str: 'notEditType',  // Not-Edit-type terms are skipped, because they..
          queryOptions: {      // ..probably won't need autocomplete anymore.
            sort: { dictID: ['X-not', 'Y-not'] } }
        },
        { queryOptions: { sort: { dictID: ['D', 'E'] } } }
      ];

      make({ vsmDictionary: dict2, initialValue: { terms: terms1, conns: [] } });
      vueTick(() => {
        expect(calledWith.filter.id)
          .to.have.members(['A', 'B', 'C', 'D', 'E']);  // (Or some permutation).


        // Part 2: updating the `initialValue` prop makes it preload again.
        var terms2 = [
          { queryOptions: { filter: { dictID: ['F', 'G'] } } }
        ];
        w.vm.$forceUpdate();  // As earlier: spur 'vue-test-utils@1.0.0-beta.28'.
        w.setProps({ initialValue: { terms: terms2, conns: [] } });
        expect(calledWith.filter.id).to.have.members(['F', 'G']);


        // Part 3: it does not call `getDictInfos()` if not wrapped in a cacher.
        calledWith = false;

        var dict3 = new VsmDictionaryLocal();  // No wrapped cacher this time.
        var origFunc = dict3.getDictInfos.bind(dict3);
        dict3.getDictInfos = function(options, cbf) {
          calledWith = options;
          origFunc(options, cbf);
        };

        var terms3 = [
          { str: 'xy',
            queryOptions: { filter: { dictID: ['H'] } }
          }
        ];

        make({ vsmDictionary: dict3, initialValue: { terms: terms3, conns: []}});
        vueTick(() => {
          calledWith.should.equal(false);  // Not called this time.
          cb();
        });
      });
    });



    // To add:
    // - Prop `initialValue` has effect.
    // - Giving a new `initialValue` has effect.
    // - Giving a new `initialValue` has effect, after changing vsm-box content.
    // - After getting a new `sizes`, it fills in missing fields again,
    //   which TheTerms can keep using without problem.
    // - TheConns changes width along with changes in TheTerms's width.
    // - Prop `allowClassNull` has effect.
    // - Prop `freshListDelay` has effect.
    // - ?: At creation, VsmBox already emits a `change`+{terms,conns},
    //   because it can already have updated some IDs (for Referring Terms).
    //   + Or not? Because an <input> component does so neither...
    // - Emits `change`+value on addition/deletion/change/move of term,
    //   and on addition/deletion of conn.
    // - Passes `custom-term` to Term.
    // - Passes `custom-popup` to ThePopup.
    // - Passes `custom-item` to Term's vsm-autocomplete.
    // - Passes `custom-item-literal` to Term's vsm-autocomplete.
    // - Emits a 'change-init' event (+cleaned terms&conns) at start.
    // - Emits a 'change' event on a change to TheTerms.
    // - Emits a 'change' event on a change to TheConns.
  });



  describe('a', () => {
    /*
    it('a', cb => cb());  /**/


  });

});
