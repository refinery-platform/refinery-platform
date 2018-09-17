(function () {
  'use strict';

  describe('rpInputGroupHelpPopover component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/input-group-help-popover.html'),
        '<div id="input-group-help-popover"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-input-group-help-popover></rp-input-group-help-popover>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-help-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
