import sanitizeHtml from './sanitizeHtml.js';


describe('sub/sanitizeHtml()', () => {

  it('HTML-encodes the opening tag of unsafe HTML-tags, and not of other tags', () => {
    sanitizeHtml('<x7>"<script>< script="a"><iframe>< Style><textARea\n>')
      .should.equal(
        '<x7>"&lt;script>&lt; script="a">&lt;iframe>&lt; Style>&lt;textARea\n>'
      );
  });

});
