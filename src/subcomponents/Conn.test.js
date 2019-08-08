import Conn from './Conn.vue';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/Conn', () => {

  var w;  // Each test will assign its created Conn component to this variable.

  const make = props => {
    w = mount(Conn, {
      propsData: Object.assign(
        {
          conn: {  // Make something like TheConns would produce.
            type: 'T',
            pos: [-1, 1, 2],
            posA: 1,
            posB: 2,
            backLevel: 4,
            footLevels: [-1, 3, 4],
          },
          sizes: {
            theConnsMarginBottom: 5,
            theConnsRowHeight: 20,
            connRefDashes: '1 1',
            connListBackSep: 2,
            connLineWidth: 1,
            connBackDepth: 5,
            connFootDepth: 15,
            connBackColor: '#000'
          },
          levelTop: level => (level + 1) * 20 + 5,
          termX1s: [1, 11, 21, 31, 41],
          termX2s: [9, 19, 29, 39, 49]
        },
        props
      )
    });
  };



  // --- TODO: Write more tests. ---


  it('initializes, when getting only the required props', () => {
    make({ });
    w.isVueInstance().should.equal(true);
  });
});
