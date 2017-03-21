(function () {
  'use strict';

  describe('Controller: Tool Select Ctrl Ctrl', function () {
    var ctrl;
    var scope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      $rootScope,
      _$controller_,
      _toolsService_
    ) {
      scope = $rootScope.$new();
      ctrl = _$controller_('ToolSelectCtrl', {
        $scope: scope
      });
      service = _toolsService_;
    }));

    it('Tool Select ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.selectedTool.select).toEqual(null);
    });

    it('Helper methods are method', function () {
      expect(angular.isFunction(ctrl.updateTool)).toBe(true);
    });

    it('refreshToolList calls correct service', function () {
      var mockServiceResponse = false;
      spyOn(service, 'getTools').and.callFake(function () {
        return {
          then: function () {
            mockServiceResponse = true;
          }
        };
      });

      expect(mockServiceResponse).toEqual(false);
      ctrl.refreshToolList();
      expect(mockServiceResponse).toEqual(true);
    });
  });
})();
