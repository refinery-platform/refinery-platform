(function () {
  'use strict';

  describe('rpGroupMemberAddModal component unit test', function () {
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
        $window.getStaticUrl('partials/commons/partials/group-member-add-modal.html'),
        '<div id="group-member-add-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-group-member-add-modal resolve="{config:{' +
        'group:{name:TestGroup}}}"></rp-group-member-add-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('group-member-add-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
