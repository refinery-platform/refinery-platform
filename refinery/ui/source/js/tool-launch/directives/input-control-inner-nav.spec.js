(function () {
  'use strict';

  describe('rpInputControlInnerNav component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/input-control-inner-nav.html'),
        '<div id="input-control-inner-nav"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-input-control-inner-nav></rp-input-control-inner-nav>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-control-inner-nav');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
