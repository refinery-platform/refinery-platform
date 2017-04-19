(function () {
  'use strict';

  describe('rpInputControlGroups component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      // Parent component contains the input-group (child) component
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/views/tool-display.html'),
        '<div id="tool-display"><rp-input-control-groups></rp-input-control-groups></div>'
      );
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/input-control-groups.html'),
        '<div id="input-control-groups"></div>'
      );
      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-tool-display></rp-tool-display>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-control-groups');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
