(function () {
  'use strict';

  describe('Controller: Data Set Visualization Ctrl', function () {
    var ctrl;
    var httpBackend;
    var mockUuid;
    var scope;
    var dataSetUuid;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetVisualization'));
    beforeEach(inject(function (
      $rootScope,
      $controller,
      $httpBackend,
      mockParamsFactory,
      $window
    ) {
      scope = $rootScope.$new();
      dataSetUuid = $window.dataSetUuid;
      httpBackend = $httpBackend;
      mockUuid = mockParamsFactory.generateUuid();
      ctrl = $controller('DataSetVisualizationCtrl', {
        $scope: scope
      });
    }));

    it('Data Set Visualization Ctrl ctrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data Set Visualization Ctrl relaunchTool should exist', function () {
      expect(ctrl.relaunchTool).toBeDefined();
    });

    it('Data Set Visualization Ctrl isOwner should exist', function () {
      expect(ctrl.isOwner).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.visLoadingFlag).toEqual('LOADING');
      expect(ctrl.visualizations).toEqual([]);
    });

    describe('deleteTool', function () {
      it('Data Set Visualization Ctrl deleteTool should exist', function () {
        expect(ctrl.deleteTool).toBeDefined();
      });
      it('deleteTool should request a delete', function () {
        var url = '/api/v2/tools/' + mockUuid + '/relaunch/';
        httpBackend.whenGET('/api/v2/tools/?data_set_uuid=' + dataSetUuid +
          '&tool_type=visualization').respond(200, []);
        httpBackend.expectDELETE(url).respond(200, 'Succcess');
        ctrl.deleteTool({ detail_url: url });
        httpBackend.flush();
        scope.$digest();
      });
    });
  });
})();
