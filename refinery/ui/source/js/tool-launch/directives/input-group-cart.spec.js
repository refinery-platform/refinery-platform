(function () {
  'use strict';

  describe('rpInputGroupCart directive unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache
    ) {
      $templateCache.put(
        '/static/partials/tool-launch/partials/input-group-cart.html',
        '<div id="input-group-cart"></div>'
      );

      var scope = $rootScope.$new();
      var template = '<rp-input-group-cart></rp-input-group-cart>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-cart');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
