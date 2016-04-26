// UNIT TESTING
'use strict';

describe('Alert Service', function () {
  var deferred;
  var rootScope;
  var service;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject(function (analysisMonitorAlertService) {
    service = analysisMonitorAlertService;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.analysesMsg.status).toEqual('');
    expect(service.analysesMsg.name).toEqual('');
  });

  describe('refreshAnalysesAlertStatusFiles', function () {
    beforeEach(inject(function (analysisService, $q, $rootScope) {
      var responseData = [{ test1: 1 }, { test2: 2 }, { test3: 3 }];
      spyOn(analysisService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(responseData);
        return { $promise: deferred.promise };
      });
      rootScope = $rootScope;
    }));

    it('methods exists', function () {
      expect(angular.isFunction(service.setAnalysesMsg)).toBe(true);
      expect(angular.isFunction(service.getAnalysesMsg)).toBe(true);
      expect(angular.isFunction(service.refreshAnalysesAlertStatus)).toBe(true);
    });

    it('refreshDataSetOwner returns a promise', function () {
      var successData;
      var response = service
        .refreshDataSetOwner({ uuid: fakeUuid })
        .then(function (responseData) {
          successData = responseData.objects[0].is_owner;
        });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(successData).toEqual(true);
      expect(service.isOwner).toEqual(true);
    });
  });
});
