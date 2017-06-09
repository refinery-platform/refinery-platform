(function () {
  'use strict';

  describe('rpAssayFilesUtilModalDetail directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var compile;
    var scope;

    beforeEach(inject(function ($compile, $rootScope, $templateCache, $window) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/assay-files-util-modal-detail.html'),
        '<div class="modal-header">Data Set Table Configuration </div> ' +
        '<div class="modal-body fileUtilModal"> List of assay attributes </div>'
      );
      compile = $compile;
      scope = $rootScope.$new();
    }));
    it('generates the appropriate HTML', function () {
      var template = '<rp-assay-files-util-modal-detail></rp-assay-files-util-modal-detail>';
      var directiveElement = compile(template)(scope);

      scope.$digest();
      expect(directiveElement.html()).toContain('fileUtilModal');
      expect(directiveElement.html()).toContain('modal-body');
    });
  });
})();
