(function () {
  'use strict';

  describe('DataSetImport.directive.isaTabImport: unit tests', function () {
    var directiveEl;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetImport'));

    beforeEach(inject(function (
      $compile,
      $rootScope,
        $templateCache,
        $window
    ) {
      $templateCache.put(
        $window.getStaticUrl('partials/data-set-import/partials/isa-tab-import.html'),
        '<div id="isa-tab-import-form"></div>'
      );
      var scope = $rootScope.$new();
      var template = '<rp-isa-tab-import import-option="import.option"></rp-isa-tab-import>';
      directiveEl = $compile(template)(scope);
      scope.$digest();
    }));

    describe('DOM', function () {
      it('should replace custom element with template', function () {
        expect(directiveEl.html()).toContain('isa-tab-import-form');
      });
    });
  });
})();
