(function () {
  'use strict';

  describe('rpNodeSelectionPopover directive unit test', function () {
    var directiveElement;
    var scope;
    var jQuery;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $compile,
      $rootScope,
      $templateCache,
      $
    ) {
      scope = $rootScope.$new();
      jQuery = $;
      var template = angular.element('<div><a rp-node-selection-popover' +
        ' class="ui-grid-selection-row-header-button">' +
        '<i class="fa fa-arrow-right ui-grid-checks"></i></a></div>');
      directiveElement = $compile(template)(scope);
      spyOn(jQuery.fn, 'popover');
      scope.$digest();
    }));

    it('generates the appropriate HTML', function () {
      expect(directiveElement.html()).toContain('ui-grid-selection-row-header-button');
      expect(directiveElement.html()).toContain('fa fa-arrow-right');
    });

    it('closeSelectionPopover test closes popOver', function () {
      expect(jQuery.fn.popover).not.toHaveBeenCalled();
      scope.closeSelectionPopover();
      expect(jQuery.fn.popover).toHaveBeenCalledWith('hide');
    });

    it('closeSelectionPopover test enables popOver', function () {
      expect(jQuery.fn.popover).not.toHaveBeenCalled();
      scope.closeSelectionPopover();
      expect(jQuery.fn.popover).toHaveBeenCalledWith('enable');
    });
  });
})();
