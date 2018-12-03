(function () {
  'use strict';

  describe('downloadFilesButton component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $controller,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/download-files-button.html'),
        '<div id="download-files-button"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-download-files-button></rp-download-files-button>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('download-files-button');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
