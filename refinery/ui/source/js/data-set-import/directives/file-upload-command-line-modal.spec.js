(function () {
  'use strict';

  describe('rpFileUploadCommandLineButton component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl(
          'partials/data-set-import/partials/file-upload-command-line-modal.html'
        ),
        '<div id="command line modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-file-upload-command-line-modal></rp-file-upload-command-line-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('command line modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
