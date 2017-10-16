(function () {
  'use strict';

  describe('rpSharingHelpPopoverDetails component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/sharing-help-popover-details.html'),
        '<div id="sharing-help-popover-details"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-sharing-help-popover-details></rp-sharing-help-popover-details>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('sharing-help-popover-details');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
