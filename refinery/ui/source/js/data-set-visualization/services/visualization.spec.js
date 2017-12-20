(function () {
  'use strict';

  describe('refinery Data Set Visualization', function () {
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDataSetVisualization'));
    beforeEach(inject(function (
      visualizationService,
      mockParamsFactory
    ) {
      service = visualizationService;
      mocker = mockParamsFactory;
    }));

    it('service should exist', function () {
      expect(service).toBeDefined();
    });

    it('view model variables should exist', function () {
      expect(service.visualizations).toEqual([]);
    });

    describe('getVisualizations', function () {
      var toolListService;
      var responseData;
      var rootScope;

      beforeEach(inject(function (toolsService, $q, $rootScope) {
        toolListService = toolsService;
        responseData = [{
          name: 'Vis Tool 1',
          create_date: '2017-12-14T16:15:02.409486Z'
        }];
        spyOn(toolListService, 'query').and.callFake(function () {
          var deferred = $q.defer();
          deferred.resolve(responseData);
          return { $promise: deferred.promise };
        });
        rootScope = $rootScope;
      }));

      it('getVisualizations is a method', function () {
        expect(angular.isFunction(service.getVisualizations)).toBe(true);
      });

      it('getVisualizations returns a promise', function () {
        var successData;
        var response = service
          .getVisualizations({ uuid: mocker.generateUuid() })
          .then(function (apiResponse) {
            successData = apiResponse.name;
          });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(responseData.name);
      });
    });
  });
})();
