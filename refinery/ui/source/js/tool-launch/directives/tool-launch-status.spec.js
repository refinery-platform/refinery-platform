(function () {
  'use strict';

  describe('rpToolLaunchStatus component unit test', function () {
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
        $window.getStaticUrl('partials/tool-launch/partials/tool-launch-status.html'),
        '<div id="tool-launch-status"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-tool-launch-status></rp-tool-launch-status>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-launch-status');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
