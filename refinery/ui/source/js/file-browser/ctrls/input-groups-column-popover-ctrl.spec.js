(function () {
  'use strict';

  describe('Controller: Input Groups Column Popover Ctrl', function () {
    var ctrl;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $controller,
      $rootScope
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('InputGroupsColumnPopoverCtrl', {
        $scope: scope
      });
    }));

    it('NodeSelectionPopoverCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.activeNode).toEqual({});
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.groupCollection).toEqual({});
      expect(ctrl.inputFileTypes).toEqual([]);
      expect(ctrl.inputFileTypeColor).toEqual({});
      expect(ctrl.nodeSelection).toEqual({});
    });
  });
})();
