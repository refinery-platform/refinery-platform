(function () {
  // Unit test for file display directive
  'use strict';

  describe('rpFileDisplay directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/file-display.html'),
        '<div id="display-select-menu"></div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-file-display></rp-file-display>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('display-select-menu');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
