(function () {
  'use strict';

  describe('rpHome component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      // Parent component contains the input-group (child) component
      $templateCache.put(
        $window.getStaticUrl('partials/home/views/home.html'),
        '<div id="home-main">/div>'
      );

      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-home></rp-home>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('home-main');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
