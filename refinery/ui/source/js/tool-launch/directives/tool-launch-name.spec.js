(function () {
  'use strict';

  describe('rpToolLaunchName component unit test', function () {
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
        $window.getStaticUrl('partials/tool-launch/partials/tool-launch-name.html'),
        '<div id="tool-launch-name"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-tool-launch-name></rp-tool-launch-name>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-launch-name');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
