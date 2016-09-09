/**
 * Created by scott on 7/25/16.
 */
'use strict';

describe('Dashboard.services.tutorialPageNavigation: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('tutorialPageNavigation');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public setData method', function () {
      expect(typeof service.setData).toEqual('function');
    });

    it('should have a public getData method', function () {
      expect(typeof service.getData).toEqual('function');
    });

    it('should have getData properly return the value set by setData',
      function () {
        var key = 'cool_key';
        service.setData(key, 'monkey');
        expect(service.getData(key)).toEqual('monkey');
      });
  });
});
