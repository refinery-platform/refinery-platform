(function () {
  'use strict';

  describe('provvisNavBar directive unit test', function () {
    var directiveElement;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryProvvis'));
    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/provvis/partials/provvis-navbar.html'),
        '<div id="provvis-navbar"></div>'
      );
      scope = $rootScope.$new();
      var template = '<provvis-nav-bar></provvis-nav-bar>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('provvis-navbar');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
