'use strict';

describe('Dashboard.services.visData: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('dashboardVisData');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "load" method', function () {
      expect(typeof service.load).toEqual('function');
    });

    it('should have a public "updateGraph" method', function () {
      expect(typeof service.updateGraph).toEqual('function');
    });

    it('should have a non-settable public "data" array property', function () {
      expect(
        Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(service), 'data'
        ).set
      ).toEqual(undefined);
    });
  });
});
