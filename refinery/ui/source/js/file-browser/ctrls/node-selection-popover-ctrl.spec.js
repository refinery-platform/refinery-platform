(function () {
  'use strict';

  describe('Controller: Node Selection Popover Ctrl', function () {
    var ctrl;
    var fakeUuid;
    var fileService;
    var mocker;
    var scope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      fileRelationshipService,
      mockParamsFactory
    ) {
      scope = $rootScope.$new();
      ctrl = $controller('NodeSelectionPopoverCtrl', {
        $scope: scope
      });
      fileService = fileRelationshipService;
      mocker = mockParamsFactory;
      fakeUuid = mocker.generateUuid();
    }));

    it('NodeSelectionPopoverCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.activeNode).toEqual({});
      expect(ctrl.attributes).toEqual({});
      expect(ctrl.currentGroup).toEqual([]);
      expect(ctrl.currentTypes).toEqual([]);
      expect(ctrl.groupCollection).toEqual({});
      expect(ctrl.inputFileTypes).toEqual([]);
      expect(ctrl.inputFileTypeColor).toEqual({});
      expect(ctrl.nodeSelection).toEqual({});
      expect(ctrl.selectionObj).toEqual({});
    });

    describe('Test selectNode', function () {
      it('selectNode is method', function () {
        expect(angular.isFunction(ctrl.selectNode)).toBe(true);
      });

      it('select node calls on correct services', function () {
        spyOn(fileService, 'setGroupCollection');
        spyOn(fileService, 'setNodeSelectCollection');

        expect(fileService.setGroupCollection).not.toHaveBeenCalled();
        expect(fileService.setNodeSelectCollection).not.toHaveBeenCalled();
        ctrl.selectNode(mocker.generateUuid());
        expect(fileService.setGroupCollection).toHaveBeenCalled();
        expect(fileService.setNodeSelectCollection).toHaveBeenCalled();
      });

      it('selectNode sets groupCollection ', function () {
        spyOn(fileService, 'setNodeSelectCollection');
        spyOn(fileService, 'setGroupCollection');
        expect(ctrl.groupCollection).toEqual({});
        fileService.groupCollection = {
          '[0,0]': [fakeUuid]
        };
        ctrl.selectNode(mocker.generateUuid());
        expect(ctrl.groupCollection).toEqual(fileService.groupCollection);
      });
    });
  });
})();
