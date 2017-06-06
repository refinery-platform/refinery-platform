(function () {
  'use strict';

  describe('rpInputGroupsColumnPopoverDetail directive unit test', function () {
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
        $window.getStaticUrl(
          'partials/file-browser/partials/input-groups-column-popover-detail.html'
        ), '<div id="input-groups-column-popover"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-input-groups-column-popover-detail>' +
        '</rp-input-groups-column-popover-detail>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-groups-column-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
