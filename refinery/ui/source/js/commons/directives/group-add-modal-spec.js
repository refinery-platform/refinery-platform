(function () {
  'use strict';

  describe('rpGroupAddModal component unit test', function () {
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
        $window.getStaticUrl('partials/commons/partials/group-add-modal.html'),
        '<div id="group-add-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-group-add-modal></rp-group-add-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('group-add-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
