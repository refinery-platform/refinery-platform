(function () {
  'use strict';

  describe('Data Set Card Factory', function () {
    var mockApiService;
    var mockDataSets = [{ name: 'Test Data Set' }];
    var mockResponse = {
      config: { params: {} },
      data: mockDataSets
    };
    var rootScope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryDashboard'));
    beforeEach(inject(function (
      $q,
      $rootScope,
      dataSetCardFactory,
      dataSetV2Service
    ) {
      mockApiService = spyOn(dataSetV2Service, 'query').and.callFake(function () {
        var deferred = $q.defer();
        deferred.resolve(mockResponse);
        return {
          $promise: deferred.promise
        };
      });
      rootScope = $rootScope;
      service = dataSetCardFactory;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.dataSets).toEqual([]);
    });

    it('getDataSets is a method', function () {
      expect(angular.isFunction(service.getDataSets)).toBe(true);
    });

    it('getDataSets calls correct service', function () {
      service.getDataSets({ });
      expect(mockApiService).toHaveBeenCalled();
    });

    it('getDataSets resolves group in mock', function () {
      var successData = {};
      var promiseResponse = service.getDataSets({}).then(function (response) {
        successData = response.data[0].name;
      });
      rootScope.$apply();
      expect(typeof promiseResponse.then).toEqual('function');
      expect(successData).toBe(mockDataSets[0].name);
    });
  });
})();
