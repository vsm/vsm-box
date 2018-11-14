import ThePopup from './ThePopup.vue';
// Some extra, global variables are defined in 'test-setup.js'.


describe('sub/ThePopup', () => {


  var w;  // Each test will assign its created ThePopup component to this var.

  const make = props => {
    w = mount(ThePopup, {
      propsData: Object.assign(
        { term: {}
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
