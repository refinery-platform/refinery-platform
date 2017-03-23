(function () {
  // Unit test for file display directive
  'use strict';

  describe('rpInputGroup component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var compile;
    var rootScope;
    var scope;
    var template;
    var directiveElement;

    beforeEach(inject(function (
      _$compile_,
      _$controller_,
      _$rootScope_,
      $templateCache
    ) {
      $templateCache.put(
        '/static/partials/tool-launch/partials/input-group.html',
        '<div id="input-group-nav"></div>'
      );
      compile = _$compile_;
      rootScope = _$rootScope_;
      scope = rootScope.$new();
      template = '<rp-input-group></rp-input-group>';
      directiveElement = compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-nav');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
