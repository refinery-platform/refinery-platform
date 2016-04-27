// UNIT TESTING
'use strict';

describe('Alert Service', function () {
  var deferred;
  var rootScope;
  var service;
  var response;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryAnalysisMonitor'));
  beforeEach(inject(function (analysisMonitorAlertService) {
    service = analysisMonitorAlertService;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
  });

  describe('refreshAnalysesAlertStatusFiles', function () {
    beforeEach(inject(function (analysisService, $q, $rootScope) {
      response = { objects: [{ name: 'TestName', status: 'PROGRESS' }] };
      spyOn(analysisService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(response);
        return {
          $promise: deferred.promise
        };
      });
      rootScope = $rootScope;
    }));

    it('methods exists', function () {
      expect(angular.isFunction(service.setAnalysesMsg)).toBe(true);
      expect(angular.isFunction(service.getAnalysesMsg)).toBe(true);
      expect(angular.isFunction(service.refreshAnalysesAlertStatus)).toBe(true);
    });

    it('set and get AnalysisMsg', function () {
      spyOn(service, 'refreshAnalysesAlertStatus');
      expect(service.refreshAnalysesAlertStatus).not.toHaveBeenCalled();
      service.setAnalysesMsg(fakeUuid);
      expect(service.refreshAnalysesAlertStatus).toHaveBeenCalled();
      var msgResponse = service.getAnalysesMsg(fakeUuid);
      expect(msgResponse.status).toEqual('');
      expect(msgResponse.name).toEqual('');
    });

    it('refreshAnalysesAlertStatus returns a promise', function () {
      var name;
      var status;
      var _promise = service
        .refreshAnalysesAlertStatus(fakeUuid)
        .then(function (_data) {
          status = _data.objects[0].status;
          name = _data.objects[0].name;
        });
      rootScope.$apply();
      expect(typeof _promise.then).toEqual('function');
      expect(status).toEqual(response.objects[0].status);
      expect(name).toEqual(response.objects[0].name);
    });
  });
});
