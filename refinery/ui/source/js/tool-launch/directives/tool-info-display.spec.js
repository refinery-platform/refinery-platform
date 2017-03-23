(function () {
  // Unit test for file display directive
  'use strict';

  describe('rpToolInfoDisplay component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var compile;
    var rootScope;
    var scope;
    var template;
    var directiveElement;

    beforeEach(inject(function (
      _$compile_,
      _$rootScope_,
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
      compile = _$compile_;
      rootScope = _$rootScope_;
      scope = rootScope.$new();
      // Parent component
      template = '<rp-tool-display></rp-tool-display>';
      directiveElement = compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-info-display');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
