(function () {
  'use strict';

  describe('provvisCanvas directive unit test', function () {
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
        $window.getStaticUrl('partials/provvis/partials/provvis-canvas.html'),
        '<div id=provvis-canvas></div>'
      );
      scope = $rootScope.$new();
      var template = '<provvis-canvas></provvis-canvas>';

      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('provvis-canvas');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
