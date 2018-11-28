(function () {
  'use strict';

  describe('Controller: Tool List Ctrl', function () {
    var ctrl;
    var genCtrl;
    var mockService;
    var mockServiceResponse = false;
    var scope;
    var service;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      $httpBackend,
      settings,
      toolListService
    ) {
      service = toolListService;
      mockService = spyOn(service, 'getTools').and.callFake(function () {
        return {
          then: function () {
            mockServiceResponse = true;
          }
        };
      });
      rootScope = $rootScope;
      scope = rootScope.$new();
      genCtrl = $controller;
      ctrl = $controller('ToolListCtrl', {
        $scope: scope
      });
    }));

    it('Tool List Ctrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('data variables should exist for views', function () {
      expect(ctrl.toolList).toEqual([]);
    });

    it('should call service when initalized', function () {
      scope.$apply();
      expect(mockService).toHaveBeenCalled();
      expect(mockServiceResponse).toEqual(true);
    });

    it('should not call service when list exists', function () {
      mockServiceResponse = false;
      mockService.calls.reset();
      angular.copy([{ name: 'FastQC' }], service.toolList);
      var newScope = rootScope.$new();
      genCtrl('ToolListCtrl', {
        $scope: newScope
      });
      newScope.$apply();
      expect(mockService).not.toHaveBeenCalled();
      expect(mockServiceResponse).toEqual(false);
    });
  });
})();
