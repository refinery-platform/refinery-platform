// UNIT TESTING
'use strict';

describe('AnalysisMonitor.service.AlertService: unit tests', function () {
  var $rootScope;
  var deferred;
  var service;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';

  beforeEach(function () {
    module('refineryApp');
    module('refineryAnalysisMonitor');

    inject(function ($injector) {
      service = $injector.get('analysisMonitorAlertService');
    });
  });

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
  });

  describe('refreshAnalysesAlertStatusFiles', function () {
    var $q;
    var analysisService;

    function initSpy (response) {
      spyOn(analysisService, 'query').and.callFake(function () {
        deferred = $q.defer();
        deferred.resolve(response);
        return {
          $promise: deferred.promise
        };
      });
    }

    beforeEach(inject(function ($injector, _$q_, _$rootScope_) {
      $q = _$q_;
      $rootScope = _$rootScope_;

      analysisService = $injector.get('analysisService');
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
      initSpy();

      var _promise = service.refreshAnalysesAlertStatus(fakeUuid);

      $rootScope.$apply();

      expect(typeof _promise.then).toEqual('function');
    });

    it(
      'should resolve promise on successful API call',
      function () {
        var testName = 'testName';
        var testStatus = 'testStatus';

        initSpy({
          limit: 1,
          next: null,
          offset: 0,
          previous: null,
          total_count: 1,
          objects: [{ name: testName, status: testStatus }]
        });

        var name;
        var status;

        service
          .refreshAnalysesAlertStatus(fakeUuid)
          .then(function (data) {
            status = data.objects[0].status;
            name = data.objects[0].name;
          });

        $rootScope.$apply();

        expect(status).toEqual(testStatus);
        expect(name).toEqual(testName);
      }
    );

    it(
      'should rejects promise on failed API call',
      function () {
        initSpy({
          limit: 1,
          next: null,
          offset: 0,
          previous: null,
          total_count: 0,
          objects: []
        });

        var error = false;

        service
          .refreshAnalysesAlertStatus(fakeUuid)
          .catch(function () {
            error = true;
          });

        $rootScope.$apply();

        expect(error).toEqual(true);
      }
    );
  });
});
