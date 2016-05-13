'use strict';

describe('Dashboard.services.dataSetsReload: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('dashboardDataSetsReloadService');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "reload" method', function () {
      expect(typeof service.reload).toEqual('function');
    });

    it('should have a public "setReload" method', function () {
      expect(typeof service.setReload).toEqual('function');
    });

    it('should set any function as "reload"', function () {
      function test () {}
      service.setReload(test);
      expect(service.reload).toEqual(test);
    });
  });
});
