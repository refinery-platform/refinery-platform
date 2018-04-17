(function () {
  'use strict';

  describe('rpGroupMemberEditModal component unit test', function () {
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
        $window.getStaticUrl('partials/commons/partials/group-member-edit-modal.html'),
        '<div id="group-member-edit-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-group-member-edit-modal resolve="{config: {}}">' +
        '</rp-group-member-edit-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('group-member-edit-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
