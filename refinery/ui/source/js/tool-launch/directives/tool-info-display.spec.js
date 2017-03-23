(function () {
  'use strict';

  describe('rpToolInfoDisplay component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache
    ) {
      // Parent component contains the input-group (child) component
      $templateCache.put(
        '/static/partials/tool-launch/partials/tool-display.html',
        '<div id="tool-display"><rp-tool-info-display></rp-tool-info-display></div>'
      );

      $templateCache.put(
        '/static/partials/tool-launch/partials/tool-info-display.html',
        '<div id="tool-info-display"></div>'
      );
      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-tool-display></rp-tool-display>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-info-display');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
