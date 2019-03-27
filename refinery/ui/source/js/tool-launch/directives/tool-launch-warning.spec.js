(function () {
  'use strict';

  describe('rpToolLaunchWarning component unit test', function () {
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
        $window.getStaticUrl('partials/tool-launch/partials/tool-launch-warning.html'),
        '<div id="tool-launch-warning"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-tool-launch-warning></rp-tool-launch-warning>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-launch-warning');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
