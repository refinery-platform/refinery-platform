(function () {
  'use strict';

  describe('rpDataFileDropdown component unit test', function () {
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
        $window.getStaticUrl('partials/file-browser/partials/data-file-dropdown.html'),
        '<div id="data-file-dropdown"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-data-file-dropdown file-status="testStr"></rp-data-file-dropdown>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('data-file-dropdown');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
