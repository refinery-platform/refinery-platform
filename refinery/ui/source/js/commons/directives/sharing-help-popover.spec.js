(function () {
  'use strict';

  describe('rpSharingHelpPopover component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/sharing-help-popover.html'),
        '<div id="sharing-help-popover"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-sharing-help-popover></rp-sharing-help-popover>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('sharing-help-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
