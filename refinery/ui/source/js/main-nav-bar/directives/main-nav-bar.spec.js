(function () {
  'use strict';

  describe('rpMainNavBar component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryMainNavBar'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/main-nav-bar/partials/main-nav-bar.html'),
        '<div id="main-nav-bar"></div>'
      );
      var scope = $rootScope.$new();
      // Parent component
      var template = '<rp-main-nav-bar></rp-main-nav-bar>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('main-nav-bar');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
