(function () {
  'use strict';

  describe('rpPermissionEditorModal component unit test', function () {
    beforeEach(module('refineryApp'));

    var directiveElement;
    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/commons/partials/permission-dialog.html'),
        '<div id="permission-editor-modal"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-permission-editor-modal></rp-permission-editor-modal>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('permission-editor-modal');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
