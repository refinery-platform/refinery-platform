(function () {
  'use strict';

  describe('rpDataFileEditModal component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $componentController,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/file-browser/partials/data-file-edit-modal.html'),
        '<div id="data-file-edit-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-data-file-edit-modal resolve="{config:{nodeObj:' +
        '{REFINERY_DOWNLOAD_URL_S:\'www.mock-address.com\'}}}"></rp-data-file-edit-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('data-file-edit-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
