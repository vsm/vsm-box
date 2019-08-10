// This demo-code is loaded and run by 'index-dev.html', via 'npm run dev'.


import Vue from 'vue';  // For fast loads @dev, include Vue in webpack bundle.
import VsmBox from './VsmBox.vue';
import VsmDictionaryLocal from 'vsm-dictionary-local';
import cacher from 'vsm-dictionary-cacher';
import stringify from 'json-stringify-pretty-compact';
import JSON5 from 'json5';


runDemo();


function runDemo() {
  Vue.config.productionTip = false;

  var demoData = createData();
  var options = Object.assign(demoData, { delay: [20, 350] });
  var dict = new (cacher(VsmDictionaryLocal)) (options);
  var lastAutoFilledText = '';


  var example1 = {
    terms: [
      { str: 'John',    classID: 'PRS:0510', instID: null },
      { str: 'eats',    classID: 'CW:0101',  instID: null },
      { str: 'chicken',
        classID: 'http://x.org/BIO/BIO:0042',  // URI, shown in ThePopup as link.
        instID : null,  dictID: 'http://x.org/BIO',  descr: 'the animal',
        queryOptions: { sort: { dictID: [ 'http://x.org/BIO' ] } } },
      { str: 'with',    classID: 'CW:0105',  instID: null,
        dictID: 'CW',  descr: 'to use' },
      { str: 'fork',    classID: 'CW:0108',  instID: null,
        queryOptions: { fixedTerms: [ { id: 'CW:0118', str: 'spoon' } ] } }
    ],
    conns: [
      { type: 'T', pos: [0, 1, 2] },
      { type: 'T', pos: [1, 3, 4] }
    ]
  };


  var example2 = {
    terms: [
      { str: 'John',      classID: 'PRS:0510', instID: 'db-id20',
        dictID: 'PRSNS',  descr: 'John Doe',
        minWidth: 5, maxWidth: 80, editWidth: 50,
        queryOptions: {
          filter: { dictID: [ 'PRSNS', 'CW', 'VAR' ] },
          sort: { dictID: [ 'CW' ] },
          fixedTerms: [
            { id: 'PRS:0501', str: 'Alice' }, { id: 'BIO:0010' }  ] },
        placeholder: 'person'
      },
      { str: 'activates', classID: 'BIO:0014', instID: null, isFocal: true },
      { str: 'burnt',     classID: 'CW:0109',  instID: null },
      { str: 'chicken',   classID: 'http://x.org/BIO/BIO:0042', instID : null,
        dictID : 'http://x.org/BIO',  descr: 'the animal',
        queryOptions: { sort: { dictID: ['http://x.org/BIO'] } } },
      { str: 'with',      classID: 'CW:0105',  instID: null,
        dictID: 'CW',  descr: 'to use' },
      { str: 'Ca2+', style: 'u2-4', descr: 'Calcium ion',
        classID: 'BIO:0010', instID: null },  ///, minWidth: 47},
      { str: 'with',      classID: 'CW:0106',  instID: null,
        dictID: 'CW',  descr: 'to be accompanied by' },
      { str: 'cls', classID: 'A:01', dictID: 'A', descr: 'descr-1' },
      { str: 'lit' },
      { editWidth: 20 },
      { type: 'EC', editWidth: 20, placeholder: 'pl' },
      { type: 'EL', editWidth: 20, placeholder: 'pl' },
      { type: 'ER', editWidth: 20 },
      { str: 'and',       classID: 'CW:0005',  instID: null,
        dictID: 'CW',  descr: 'a set of items' },
      { str: 'himself',   classID: 'PRS:0510',
        instID: 'db-id40', parentID: 'db-id20',
        ///instID: 'https://me.org/db-id40', parentID: 'https://me.org/db-id20',
        placeholder: 'person' }
    ],
    conns: [
      //{ type: 'T', pos: [ 3, 4, -1 ] },
      { type: 'T', pos: [ 3, -1, 2 ] },
      { type: 'T', pos: [ 0, 1, 3 ] },
      { type: 'T', pos: [ 1, 4, 5 ] },
      { type: 'L', pos: [ 13, 7, 8, 9, 10, 11, 12, 14 ] },
      { type: 'T', pos: [ 1, 6, 13 ] },
      { type: 'R', pos: [ 14, 0 ] }
    ]
  };


  var example3 = {
    terms: [
      { str: 'John', classID: 'PRS:0510', instID: null },
      { str: 'eats', classID: 'CW:0101', instID: null },
      { str: 'chicken', classID: 'http://x.org/BIO/BIO:0042', instID: null,
        queryOptions: { sort: { dictID: [ 'http://x.org/BIO' ] } } },
      { str: 'with', classID: 'CW:0106', instID: null },
      { str: 'Alice', classID: 'PRS:0501', instID: null },
      { str: 'Bob', classID: 'PRS:0502', instID: null },
      { str: 'and', classID: 'CW:0005', instID: null },
      { str: 'himself', classID: null, instID: null, parentID: null }
    ],
    conns: [
      { type: 'T', pos: [ 0, 1, 2 ] },
      { type: 'T', pos: [ 1, 3, 6 ] },
      { type: 'L', pos: [ 6, 4, 5, 7 ] }
    ]
  };



  // Activate Vue on the #app element and its children.
  new Vue({
    el: '#app',

    components: {
      'vsm-box': VsmBox
    },

    data: function() { return {
      vsmDictionary: dict,
      queryOptions: false,  ///{ perPage: 5 },
      placeholder: 'Type a term or doubleclick for menu',  ///false,
      maxStringLengths: undefined &&  // Change to !undefined to activate this.
        { str: 5,  strAndDescr: 30  },
      freshListDelay: 0, ///1000,
      allowClassNull: true,
      initialValue: {
        terms: 0&&[] ||             // (It will use the first one with a `1&&`).
          0&&[
            { str:'aaa',   classID: 'A01', instID: 'id121', style: 'i' },
            { str:'abcde', classID: 'A01', instID: 'id122' },
            { str:'12345', classID: 'A01', instID: 'id123' },
            { str: 'Ca2+', style: 'u2-4', classID: 'B:03', instID: null }
          ] ||
          0&&[{ str: 'aaa' }, { }, { str: 'bbb' }, { type: 'EL' }] ||
          0&&[{ type: 'ER' }, { }, { type: 'EL' }, { type: 'EC' }] ||
          0&&[{ type: 'EL' }, { str: 'aaa' }] ||
          0&&[
            { str: 'activates', classID: 'BIO:0014', instID: null,
              minWidth: 5, maxWidth: 47, editWidth: 50,
              queryOptions: {
                filter: { dictID: ['CW', 'VAR', 'http://aaa/qqq'] },
                sort:   { dictID: ['CW'] },
                fixedTerms: [
                  { id: 'PRS:0501', str: 'Alice' },
                  { id: 'PRS:0502' },
                  { id: 'BIO:0010' },
                  { id: 'PRS:9999' } ],
                z: ['species', 'color']
              }
            },
            { str: 'activates', classID: 'VAR:0016', instID: 'http://xy.z/I1234',
              queryOptions: { z: true }
            },
            { str: 'activates', classID: 'B:01',     instID: null, dictID: 'CW',
              queryOptions: { z: [] }
            },
            { str: 'activates', classID: 'http://xyz.org/B:15', instID: null },
            {             editWidth: 24, queryOptions: {sort:{dictID:['CW']}} },
            { type: 'EL', editWidth: 24 },
            { str: 'that', classID: 'B:01', instID: null, parentID: 'ab1' },
            { str: 'a', classID: null, instID: null },
            { str: 'ab' },
            { str: 'abc', classID: 'C:01', style: 'b;i' },
          ] ||
          0&&[{ str: 'a' }, { str: 'bbb' }, { str: 'ccc' }, { str: 'ddd' }] ||
          0&&[{ str: 'activates' }, { str: '  activates  ' }] ||
          0&&example1.terms ||
          1&&example2.terms ||
          1&&example3.terms || 1&&[],
        conns: 0&&[] ||
          0&&[
            { type: 'T', pos: [ -1,  0,  1 ] },
            { type: 'T', pos: [ -1,  1,  0 ] },
            { type: 'T', pos: [  0, -1,  1 ] },
            { type: 'T', pos: [  1, -1,  0 ] },
            { type: 'T', pos: [  0,  1, -1 ] },
            { type: 'T', pos: [  1,  0, -1 ] }
          ] ||
          0&&[
            { type: 'T', pos: [ 0       ], isUC: true },
            { type: 'T', pos: [ 1, 1    ], isUC: true },
            { type: 'T', pos: [ 0, 1    ], isUC: true },
            { type: 'T', pos: [ 2, 3, 3 ], isUC: true },
            { type: 'T', pos: [-1, 4, 4 ], isUC: true },
            { type: 'T', pos: [ 2, 3, 4 ], isUC: true },
            { type: 'L', pos: [ 5       ], isUC: true },
            { type: 'L', pos: [ 5, 5    ], isUC: true },
            { type: 'L', pos: [ 6, 7    ], isUC: true },
            { type: 'L', pos: [ 6, 7, 7 ], isUC: true },
            { type: 'R', pos: [ 8       ], isUC: true },
            { type: 'R', pos: [ 9, 9    ], isUC: true },
            { type: 'R', pos: [ 8, 9    ], isUC: true },
            { type: 'L', pos: [ 12, 10, 11, 13, 11 ], isUC: true }
          ] ||
          0&&example1.conns ||
          0&&example2.conns.reverse() ||
          1&&example2.conns ||
          1&&example3.conns || 1&&[],
      },
      sizes: {
        ///minWidth: 80,  // 360,
        ///widthScale: 2,
        ///connFootVisible: false,
      },
      customTerm: false && function(o) {
        return o.type == 'L' ? o.strs : { str:
          ( '<span style="font-size: 8px; color: #777;">' +
            o.index + '.&nbsp; </span>' + o.strs.str )
        };
      },
      customPopup: false && function(o) {
        o.strs.infoExtra1 = 'Test1: ' + [
          o.strs.descr.split(' ')[0],
          o.type,
          o.term.classID,
          o.dictInfo.abbrev || o.dictInfo.name,
          o.z && o.z.extraChar ? o.z.extraChar : '',
          o.vsmDictionary.refTerms.length
        ].join(', ');
        o.strs.infoExtra2 = 'Test2';
        o.strs.menuExtra1 = 'TestM1';
        o.strs.menuExtra2 = 'TestM2';
        return o.strs;
      },
      customItem: !false && function(o) {
        var { item, strs, dictInfo } = o;
        var span = s => '<span style="color: #000; ' +
          'font-weight: normal; margin-left: 1ch;">' + s + '</span>';
        if (item.dictID == 'http://x.org/BIO') {
          strs.str += span('☘');
        }
        else if (item.dictID == 'VAR') {
          var synonyms = item.terms && item.terms.length > 1 ?
            item.terms.map(termObj => termObj.str).join(', ') : '';
          return Object.assign(strs, {
            str: strs.str +
              `${ item.z && item.z.extraChar ? span(item.z.extraChar): '' }`,
            descr:
              (synonyms ? `<i>=${ synonyms };</i>&nbsp; ` : '') + strs.descr,
            info: item.id,
            infoTitle: (dictInfo && dictInfo.name ?
              `${ dictInfo.id } : ${ dictInfo.name }` : '')
          });
        }
        return strs;
      },
      customItemLiteral: false && function(o) {
        return Object.assign(o.strs, {
          strTitle: 'Search more',
          str: 'Search for ' + o.strs.str
        });
      },
      advancedSearch: !false && function(data, cb) {
        setTimeout(() => cb({
          str: data.str,  ///style: 'i',
          id: data.allowClassNull ? null : '' + Math.floor(Math.random() * 1e6)
        }), 150);
      },
      termCopied: 0,
      msg: '',
      stateText: '',
      stateTextWidth: 0
    }; },


    watch: {
      stateText: function() {             // Textarea changes ==> change VsmBox.
        this.stateTextToBoxValue();
      }
    },


    mounted: function() {
      this.boxValueToStateText(this.initialValue); // Initial VsmBox ==>textarea.
      this.setMsg('');
      this.stateTextWidth =
        getComputedStyle(document.getElementById('stateText')).width;
    },


    methods: {
      termCopy(term) {
        this.termCopied = term;
        ///console.log('Copy: ' + JSON.stringify(this.termCopied));
      },

      termPaste() {
        ///console.log('Paste: ' + JSON.stringify(this.termCopied));
        return this.termCopied;
      },


      onChange(value)  {          // VsmBox content changes ==> change textarea.
        this.boxValueToStateText(value);
      },


      boxValueToStateText(value) {
        // Make readable & compact JSON output, then change it a bit to JSON5.
        lastAutoFilledText = this.stateText = stringify(value, { margins: true })
          .replace(/ "([a-zA-Z]*)": /g, ' $1: ')       // Unquote property-keys.
          .replace(/{\n {2}terms:/, '{ terms:')        // Merge first two lines.
          .replace(/, conns:/, ',\n  conns:')    // 'conns:' always on new line.
          .replace(/'/g, '\\\'') .replace(/"/g, '\'')    // Un-doublequote keys.
          .replace(/\n {4}{\n {6}/g, '\n    { ')         // Less spacious Terms.
          .replace(/\n {6,10}([\]}],?\n)/g, ' $1') // Compactify `queryOptions`.
          .replace(/] }$/, ']\n}')              // Final '}' always on new line.
          .replace(/] ?]\n}$/, ']\n  ]\n}')    // TheConns's ']' on its own line.
          .replace(/(: \[|\],) ?\[/g, '$1\n    ['); // Each Conn on its own line.
        this.setMsg(1);
      },


      stateTextToBoxValue() {
        // Do not update VsmBox's `initialValue` if the reported textarea change
        // was only caused by an automated reaction to a VsmBox emitted 'change'.
        // Otherwise, VsmBox would re-init and discard backupIDs/drag-state/etc.
        var abort = lastAutoFilledText === this.stateText;
        lastAutoFilledText = false;
        if (abort)  return;

        try {
          this.initialValue = JSON5.parse(this.stateText);
          this.setMsg(-1);
        }
        catch (err) {
          this.setMsg(err.toString().replace('JSON5: ', ''));
        }
      },


      setMsg(msg) {
        var d = new Date();
        d = '[' + ('0' + d.getHours()).slice(-2) + ':' +
          ('0' + d.getMinutes()).slice(-2) + ':' +
          ('0' + d.getSeconds()).slice(-2) + '.' +
          ('00' + d.getMilliseconds()).slice(-3, -1) + ']';
        this.msg = !msg ? '' :
          ((msg == -1 ? '<---' : msg == 1 ? '--->' : msg) + ' &nbsp;' + d);
      },


      onButtonClear()    { this.fillBoth('Cleared', { terms: [], conns: [] }) },
      onButtonExample1() { this.fillBoth('Example 1', example1) },
      onButtonExample2() { this.fillBoth('Example 2', example2) },

      fillBoth(name, data) {
        this.initialValue = JSON.parse(JSON.stringify(data));
        this.boxValueToStateText(this.initialValue);
        this.setMsg(name);
      }
    }
  });
}




// ---------- DEMO-DATA ----------
function createData() {
  return {
    dictData: [
      { id: 'CW',  abbrev: 'CW',  name: 'Common words',  entries: [
        { id: 'CW:0045', terms: [{str: 'about'}] },
        { id: 'CW:0082', terms: [{str: 'after'}] },
        { id: 'CW:0036', terms: [{str: 'all'}] },
        { id: 'CW:0080', terms: [{str: 'also'}] },
        { id: 'CW:0095', terms: [{str: 'any'}] },
        { id: 'CW:0017', terms: [{str: 'as'}] },
        { id: 'CW:0081', terms: [{str: 'back'}] },
        { id: 'CW:0094', terms: [{str: 'because'}] },
        { id: 'CW:0024', terms: [{str: 'by'}] },
        { id: 'CW:0053', terms: [{str: 'can'}] },
        { id: 'CW:0076', terms: [{str: 'come'}] },
        { id: 'CW:0067', terms: [{str: 'could'}] },
        { id: 'CW:0098', terms: [{str: 'day'}] },
        { id: 'CW:0019', terms: [{str: 'do'}] },
        { id: 'CW:0088', terms: [{str: 'first'}] },
        { id: 'CW:0025', terms: [{str: 'from'}] },
        { id: 'CW:0047', terms: [{str: 'get'}] },
        { id: 'CW:0097', terms: [{str: 'give'}] },
        { id: 'CW:0049', terms: [{str: 'go'}] },
        { id: 'CW:0065', terms: [{str: 'good'}] },
        { id: 'CW:0009', terms: [{str: 'have'}] },
        { id: 'CW:0062', terms: [{str: 'into'}] },
        { id: 'CW:0057', terms: [{str: 'just'}] },
        { id: 'CW:0059', terms: [{str: 'know'}] },
        { id: 'CW:0054', terms: [{str: 'like'}] },
        { id: 'CW:0074', terms: [{str: 'look'}] },
        { id: 'CW:0052', terms: [{str: 'make'}] },
        { id: 'CW:0099', terms: [{str: 'most'}] },
        { id: 'CW:0092', terms: [{str: 'new'}] },
        { id: 'CW:0056', terms: [{str: 'no'}] },
        { id: 'CW:0013', terms: [{str: 'not'}] },
        { id: 'CW:0073', terms: [{str: 'now'}] },
        { id: 'CW:0014', terms: [{str: 'on'}] },
        { id: 'CW:0035', terms: [{str: 'one'}] },
        { id: 'CW:0075', terms: [{str: 'only'}] },
        { id: 'CW:0031', terms: [{str: 'or'}] },
        { id: 'CW:0078', terms: [{str: 'over'}] },
        { id: 'CW:0061', terms: [{str: 'person'}] },
        { id: 'CW:0066', terms: [{str: 'some'}] },
        { id: 'CW:0060', terms: [{str: 'take'}] },
        { id: 'CW:0079', terms: [{str: 'think'}] },
        { id: 'CW:0055', terms: [{str: 'time'}] },
        { id: 'CW:0084', terms: [{str: 'two'}] },
        { id: 'CW:0042', terms: [{str: 'up'}] },
        { id: 'CW:0083', terms: [{str: 'use'}] },
        { id: 'CW:0093', terms: [{str: 'want'}] },
        { id: 'CW:0090', terms: [{str: 'way'}] },
        { id: 'CW:0087', terms: [{str: 'work'}] },
        { id: 'CW:0063', terms: [{str: 'year'}, {str: 'years'}] },
        { id: 'CW:0101', descr: 'to eat',
          terms: [{str: 'eat'}, {str: 'eats'}, {str: 'to eat'}] },
        { id: 'CW:0069',  descr: 'to see',
          terms: [{str: 'see'}, {str: 'sees'}, {str: 'to see'}] },
        { id: 'CW:0028',  descr: 'to say',
          terms: [{str: 'say'}, {str: 'says'}, {str: 'to say'}] },
        { id: 'CW:0103', descr: 'someone with little courage',
          terms: [
            {str: 'coward'},
            {str: 'chicken', style: 'i', descr: 'as in \'coward\''}
          ]
        },
        { id: 'CW:0108', terms: [{str: 'fork'}] },
        { id: 'CW:0118', terms: [{str: 'spoon'}] },
        { id: 'CW:0109', terms: [{str: 'burnt'}] },
        { id: 'CW:0105', descr: 'to use', terms: [
          {str: 'with'},
          {str: 'using'},
          {str: 'use of'},
          {str: 'to use'}
        ]},
        { id: 'CW:0106', descr: 'to be accompanied by', terms: [
          {str: 'with'},
          {str: 'accompanied by'},
          {str: 'to be accompanied by'}
        ]},
        { id: 'CW:0020', descr: 'associated with', terms: [{str: 'at'}] },
        { id: 'CW:0007', descr: 'to be located in', terms: [
          {str: 'in', style: ''}, {str: 'is located in'}, {str: 'located in'},
          {str: 'located at'}, {str: 'at'} ]
          ///, {str: 'locatedness-inside', style: 'i'}
        },
        { id: 'CW:0115', descr: 'to happen in time period',
          terms: [{str: 'in'}, {str: 'during'}] },
        { id: 'CW:0116', descr: 'to happen at timepoint',
          terms: [{str: 'at', descr: 'happens at timepoint'}] },
        { id: 'CW:0111', descr: 'to pertain to',
          terms: [{str: 'in', descr: 'pertains to'}] },
        { id: 'CW:0005', descr: 'a set of items',
          terms: [{str: 'and'}]
        },
        { id: 'CW:0112', descr: 'a list where item order is important',
          terms: [{str: 'ordered-and', style: 'i0-8'}] },
        { id: 'CW:0002', descr: 'to be',
          terms: [
            {str: 'to be'},
            {str: 'being'},
            {str: 'is', descr: '\'to be\', in its 3rd-person avatar'},
            {str: 'are', descr: '\'to be\', in its plural avatar'}
          ]
        },
        { id: 'CW:0123', descr: 'belonging to', terms: [{str: 'of'}, {str: '\'s'}] },
        { id: 'CW:0003', descr: 'having purpose', terms: [{str: 'to'}, {str: 'for'}] },
        { id: 'CW:0126', terms: [{str: 'book'}] },
        { id: 'CW:0131',
          descr: 'Single-term relation concept, for the \'if ... then ...\' ' +
            'construct used in natural language',
          terms: [{str: 'if-then'}]
        },
        { id: 'CW:0132',
          descr: '= \'if not {subject} then {object}\'',
          terms: [{str: 'else'}]
        },
        { id: 'CW:0133', terms: [{str: 'has'}] },
        { id: 'CW:0141', descr: 'being located amongst',
          terms: [{str: 'between'}, {str: 'is between'}, {str: 'are between'}] },
        { id: 'CW:0142', descr: 'the location amongst some things',
          terms: [{str: 'between'}]
        },
      ]},

      { id: 'PRSNS', abbrev: 'PRS', name: 'Persons', entries: [
        { id: 'PRS:0004', terms: [{str: 'Brown'}] },
        { id: 'PRS:0020', terms: [{str: 'Clarke'}] },
        { id: 'PRS:0008', terms: [{str: 'Davis'}] },
        { id: 'PRS:0012', terms: [{str: 'Evans'}] },
        { id: 'PRS:0016', terms: [{str: 'Green'}] },
        { id: 'PRS:0017', terms: [{str: 'Hall'}] },
        { id: 'PRS:0019', terms: [{str: 'Jackson'}] },
        { id: 'PRS:0007', terms: [{str: 'Johnson'}] },
        { id: 'PRS:0002', terms: [{str: 'Jones'}] },
        { id: 'PRS:0015', terms: [{str: 'Roberts'}] },
        { id: 'PRS:0009', terms: [{str: 'Robinson'}] },
        { id: 'PRS:0001', terms: [{str: 'Smith'}] },
        { id: 'PRS:0003', terms: [{str: 'Taylor'}] },
        { id: 'PRS:0011', terms: [{str: 'Thompson'}] },
        { id: 'PRS:0013', terms: [{str: 'Walker'}] },
        { id: 'PRS:0014', terms: [{str: 'White'}] },
        { id: 'PRS:0005', terms: [{str: 'Williams'}] },
        { id: 'PRS:0006', terms: [{str: 'Wilson'}] },
        { id: 'PRS:0018', terms: [{str: 'Wood'}] },
        { id: 'PRS:0010', terms: [{str: 'Wright'}] },
        { id: 'PRS:0501', terms: [{str: 'Alice'}] },
        { id: 'PRS:0502', terms: [{str: 'Bob'}] },
        { id: 'PRS:0510', terms: [{str: 'John'}],
          descr: 'imaginary person John Doe from Norway' },
        { id: 'PRS:0256', descr: 'Steven Vercruysse (Cruy), creator of VSM',
          terms: [{str: 'Steven'}] },
      ]},

      { id: 'http://x.org/BIO', name: 'Biological concepts', entries: [
        { id:'BIO:0010', terms: [{str: 'Ca2+', style: 'u2-4'}] },
        { id:'BIO:0011', terms: [{str: 'Na+Cl-', style: 'u2;u5'}] },
        { id:'BIO:0001', terms: [{str: 'beta-Carotene'}, {str: 'β-Carotene'}] },
        { id:'BIO:0002', descr: 'the Human gene ICER', terms: [{str: 'ICER'}] },
        { id:'BIO:0003', descr: 'the Human gene cdc2',
          terms: [{str: 'cdc2', style: 'i'}],  ///, {str: 'cdc'}, {str: 'KRP5'},
          z: {species: 'Human'}
        },
        { id:'BIO:0903', descr: 'the Mouse gene cdc2', terms: [{str: 'cdc2'}] },
        { id:'BIO:0014',
          descr: 'To activate (= the activation of) a molecule, by some actor',
          terms: [
            {str: 'activates'},
            {str: 'activation'},
            {str: 'activation (of)', style: 'i11-15'}
          ],
        },
        { id:'BIO:0015', terms: [{str: 'inhibits'}] },
        { id:'BIO:0016', terms: [{str: 'regulates'}, {str: 'regulation'}] },
        { id:'BIO:0017', terms: [{str: 'has function'}] },
        { id:'BIO:0018', terms: [{str: 'according to'}] },
        { id:'BIO:0019', terms: [
          {str: 'binds to'},
          {str: 'binds'},
          {str: 'bind'},
          {str: 'bound to'}
        ]},
        { id:'BIO:0030',
          descr: 'addition of a ubiquitin-molecule tag to a protein, ' +
            'which marks it for degradation by a proteasome',
          terms: [{str: 'ubiquitinates'}]
        },
        { id:'http://x.org/BIO/BIO:0042',  // Example of a URI-type identifier.
          descr: 'the animal', terms: [{str: 'chicken'}] },
        { id:'BIO:0101', descr: 'example molecule A', terms: [{str: 'A'}] },
        { id:'BIO:0102', descr: 'example molecule B', terms: [{str: 'B'}] },
        { id:'BIO:0103', descr: 'example molecule C', terms: [{str: 'C'}] },
        { id:'BIO:0104', descr: 'example molecule D', terms: [{str: 'D'}] },
        { id:'BIO:0124', descr: 'example molecule X', terms: [{str: 'X'}] },
        { id:'BIO:0131', descr: 'example protein A',  terms: [{str: 'protein A'}] },
        { id:'BIO:0132', descr: 'example protein B',  terms: [{str: 'protein B'}] },
        { id:'BIO:0133', descr: 'example location C', terms: [{str: 'location C'}] },
        { id:'BIO:0151', descr: 'the blade of a plant leaf (Plant Ontology term)',
          terms: [{str: 'leaf lamina'}] },
        { id:'BIO:0152', descr: 'a plant leaf shape variation (PATO term)',
          terms: [{str: 'twisted'}] },
      ]},

      { id: 'VAR', abbrev: 'VAR', name: 'Various concepts',
        entries: [
          { id: 'VAR:0015', descr: 'Computer science, Information Technology',
            terms: [{str: 'IT'}] },
          { id: 'VAR:0016', descr: 'to turn on a device',
            terms: [{str: 'activate'}, {str: 'activates'}],
            z: { extraChar: '⍾' }
          },
          { id: 'VAR:0017', terms: [{str: 'device'}] },
          { id: 'VAR:0018', descr: 'is subclass of',
            terms: [{str: 'is subclass of'}, {str: 'is a'}] },
          { id: 'VAR:0021', descr: 'percent',
            terms: [{str: 'percent'}, {str: '%'}, {str: 'percentage'}] },
          { id: 'VAR:0093', descr: 'unit of acceleration',
            terms: [{str: 'm/s2', style: 'u3'}] },
          { id: 'VAR:0151', descr: 'the mathematical operator \'for all\'',
            terms: [{str: '∀'}, {str: 'for all'}] },
          { id: 'VAR:0153', descr: 'the mathematical operator \'there exists\'',
            terms: [{str: '∃'}, {str: 'exists'}] },
          { id: 'VAR:0011',
            terms: [
              {str: 'HCO3- ⇌ CO32- + H+', style: 's3;u4;s10;u11-13;u17'}
            ],
            descr: 'step 2 of carbonic acid ionization reaction'
          },
          { id: 'VAR:0255',
            descr: 'Visual Syntax Method, a way to represent ' +
              'contextualised information, so it is manageable by ' +
              'both humans and computers',
            terms: [{str: 'VSM'}]
          },
        ]
      },

      { id: '00', name: 'Numbers', entries: [
        { id: '00:5e+0',   terms: [{str:  '5'}, {str: 'five'}] },
        { id: '00:1.2e+1', terms: [{str: '12'}, {str: 'twelve'}, {str: 'dozen'}],
          descr: 'the amount of twelve' },
        { id: '00:4e+1',   terms: [{str: '40'}, {str: 'forty'}] },
      ]},

      { id: 'NEW', name: 'New Concepts', entries: [] },
    ],

    refTerms: [
      'it', 'this', 'that', 'they', 'these', 'them'
    ]
  };
}
