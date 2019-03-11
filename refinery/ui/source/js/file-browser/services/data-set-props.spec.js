(function () {
  // UNIT TESTING
  'use strict';

  describe('Data Set Prop Service', function () {
    var deferred;
    var rootScope;
    var service;
    var fakeUuid;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryFileBrowser'));
    beforeEach(inject(function (dataSetPropsService, mockParamsFactory) {
      service = dataSetPropsService;
      fakeUuid = mockParamsFactory.generateUuid();
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.dataSet).toEqual({});
    });

    describe('dataSetPropsService', function () {
      beforeEach(inject(function (dataSetV2Service, $q, $rootScope) {
        var responseData = { data: { is_owner: true } };
        spyOn(dataSetV2Service, 'query').and.callFake(function () {
          deferred = $q.defer();
          deferred.resolve(responseData);
          return { $promise: deferred.promise };
        });
        rootScope = $rootScope;
      }));

      it('refreshDataSetOwner is a method', function () {
        expect(angular.isFunction(service.refreshDataSet)).toBe(true);
      });

      it('refreshDataSetOwner returns a promise', function () {
        var successData;
        var response = service
          .refreshDataSet({ uuid: fakeUuid })
          .then(function (responseData) {
            successData = responseData.data.is_owner;
          });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData).toEqual(true);
        expect(service.dataSet.is_owner).toEqual(true);
      });
    });
  });
})();
