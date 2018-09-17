(function () {
  'use strict';

  describe('aPIResponseModal component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $controller,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/api-response-modal.html'),
        '<div id="api-response-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-api-response-modal></rp-api-response-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('api-response-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
