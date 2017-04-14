(function () {
  'use strict';

  describe('rpNodeSelectionPopoverDetail directive unit test', function () {
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
        $window.getStaticUrl('partials/file-browser/partials/node-selection-popover-detail.html'),
        '<div id="node-selection-popover"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-node-selection-popover-detail></rp-node-selection-popover-detail>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('node-selection-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
