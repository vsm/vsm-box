import Conn from './Conn.vue';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/Conn', () => {

  var w;  // Each test will assign its created Conn component to this variable.

  const make = props => {
    w = mount(Conn, {
      propsData: Object.assign(
        { index: 0,
          paneHeight: 100,
          conn: []
        },
        props
      )
    });
  };


  it('initializes, when getting only the required props', () => {
    make({ });
    w.isVueInstance().should.equal(true);
  });
});
