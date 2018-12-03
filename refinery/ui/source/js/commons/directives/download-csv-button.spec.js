(function () {
  'use strict';

  describe('downloadCsvButton component unit test', function () {
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
        $window.getStaticUrl('partials/commons/partials/download-csv-button.html'),
        '<div id="download-csv-button"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-download-csv-button></rp-download-csv-button>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('download-csv-button');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
