(function () {
  'use strict';

  describe('rpDataSetTransferModal component unit test', function () {
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
        $window.getStaticUrl('partials/dashboard/partials/data-set-transfer-modal.html'),
        '<div id="data-set-transfer-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-data-set-transfer-modal resolve="{config:{}}">' +
        '</rp-data-set-transfer-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('data-set-transfer-');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
