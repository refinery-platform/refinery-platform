(function () {
  'use strict';

  describe('rpToolDisplay component unit test', function () {
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
      $templateCache.put(
        '/static/partials/tool-launch/partials/tool-display.html',
        '<div id="tool-display"></div>'
      );
      compile = _$compile_;
      rootScope = _$rootScope_;
      scope = rootScope.$new();
      template = '<rp-tool-display></rp-tool-display>';
      directiveElement = compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-display');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
