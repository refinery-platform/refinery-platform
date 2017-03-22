(function () {
  // Unit test for file display directive
  'use strict';

  describe('rpInputGroupCartTree directive unit test', function () {
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
        '/static/partials/tool-launch/partials/input-group-cart-tree.html',
        '<div id="input-group-cart-tree"></div>'
      );
      compile = _$compile_;
      rootScope = _$rootScope_;
      scope = rootScope.$new();
      template = '<rp-input-group-cart-tree></rp-input-group-cart-tree>';
      directiveElement = compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-cart-tree');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
