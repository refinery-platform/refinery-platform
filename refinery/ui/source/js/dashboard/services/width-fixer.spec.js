'use strict';

describe('Dashboard.services.widthFixer: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('dashboardWidthFixerService');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "trigger" method', function () {
      expect(typeof service.trigger).toEqual('function');
    });

    it('should have a public "fixer" array property', function () {
      expect(service.fixer instanceof Array).toEqual(true);
    });

    it('should have a public "resetter" array property', function () {
      expect(service.resetter instanceof Array).toEqual(true);
    });

    it('should have a public "fixedWidth" number property', function () {
      expect(typeof service.fixedWidth).toEqual('number');
    });

    it('should subscribe to events', function () {
      var a = 0;
      var b = 0;

      service.fixer.push(function () {
        a++;
      });

      service.resetter.push(function () {
        b++;
      });

      service.trigger('fixer');
      service.trigger('resetter');

      expect(a + b).toEqual(2);
    });

    it('should store a _fixedWidth_ property', function () {
      var test = {};

      service.fixedWidth = test;

      expect(service.fixedWidth).toEqual(test);
    });
  });
});
