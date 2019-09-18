(function () {
  'use strict';

  describe('rpSelectAllButton component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window,
      toolSelectService
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/select-all-button.html'),
        '<div id="select-all-button"></div>'
      );
      toolSelectService.selectedTool.file_relationship = angular.copy({ input_files: [] });
      toolSelectService.selectedTool.file_relationship.input_files.push({ uuid: '' });
      var scope = $rootScope.$new();
      var template = '<rp-select-all-button></rp-select-all-button>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('select-all-button');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
