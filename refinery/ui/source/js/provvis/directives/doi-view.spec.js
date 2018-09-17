(function () {
  'use strict';

  describe('DOI View directive unit test', function () {
    var directiveElement;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/provvis/partials/doi-view.html'),
        '<div id=provvis-doi-view></div>'
      );
      scope = $rootScope.$new();
      var template = '<rp-provvis-doi-view></rp-provvis-doi-view>';

      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('provvis-doi-view');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
