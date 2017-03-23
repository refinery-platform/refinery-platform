(function () {
  'use strict';

  describe('rpInputGroupCartTree directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache
    ) {
      $templateCache.put(
        '/static/partials/tool-launch/partials/input-group-cart-tree.html',
        '<div id="input-group-cart-tree"></div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-input-group-cart-tree></rp-input-group-cart-tree>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-cart-tree');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
