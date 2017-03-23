(function () {
  'use strict';

  describe('rpToolLaunchButton component unit test', function () {
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
        '/static/partials/tool-launch/partials/tool-launch-button.html',
        '<button id="tool-launch-button"></button>'
      );
      compile = _$compile_;
      rootScope = _$rootScope_;
      scope = rootScope.$new();
      template = '<rp-tool-launch-button></rp-tool-launch-button>';
      directiveElement = compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('tool-launch-button');
      expect(directiveElement.html()).toContain('</button>');
    });
  });
})();
