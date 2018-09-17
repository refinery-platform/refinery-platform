(function () {
  'use strict';

  describe('rpInputGroupDetails component unit test', function () {
    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));

    var directiveElement;

    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $window
    ) {
      // Parent component contains the input-group (child) component
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/views/tool-display.html'),
        '<div id="tool-display"><rp-input-group></rp-input-group></div>'
      );
      // Older component
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/input-group.html'),
        '<div id="input-group"><rp-input-group-details></rp-input-group-details></div>'
      );
      // Child component
      $templateCache.put(
        $window.getStaticUrl('partials/tool-launch/partials/input-group-details.html'),
        '<div id="input-group-details"></div>'
      );
      var scope = $rootScope.$new();

      // Parent component
      var template = '<rp-tool-display></rp-tool-display>';
      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('input-group-details');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
