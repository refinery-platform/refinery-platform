(function () {
  'use strict';

  describe('rpGroupEditModal component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/group-edit-modal.html'),
        '<div id="group-edit-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-group-edit-modal resolve="{config: {}}"></rp-group-edit-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('group-edit-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
