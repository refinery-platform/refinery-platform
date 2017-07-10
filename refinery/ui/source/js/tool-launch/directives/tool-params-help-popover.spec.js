(function () {
  'use strict';

  describe('rpToolParamsHelpPopover component unit test', function () {
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
        $window.getStaticUrl('partials/tool-launch/partials/tool-params-help-popover.html'),
        '<div id="tool-params-help-popover"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-tool-params-help-popover></rp-tool-params-help-popover>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-params-help-popover');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
