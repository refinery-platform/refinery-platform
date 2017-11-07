(function () {
  'use strict';

  describe('Change Layers View directive unit test', function () {
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
        $window.getStaticUrl('partials/provvis/partials/change-layers-view.html'),
        '<div id=provvis-doi-view></div>'
      );
      scope = $rootScope.$new();
      var template = '<rp-change-layers-view></rp-change-layers-view>';

      directiveElement = $compile(template)(scope);
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('change-layers-view');
      expect(directiveElement.html()).toContain('</div>');
    });
  });
})();
