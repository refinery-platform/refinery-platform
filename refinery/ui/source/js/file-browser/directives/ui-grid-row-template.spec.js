(function () {
  // Unit test for ui-grid-row-template directive
  'use strict';

  describe('rpUiGridRowTemplate directive unit test', function () {
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
        $window.getStaticUrl('partials/file-browser/partials/ui-grid-row-template.html'),
        '<span><h4>Row Template</h4></span>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-ui-grid-row-template></rp-ui-grid-row-template>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('h4');
      expect(directiveElement.html()).toContain('Row Template');
    });
  });
})();
