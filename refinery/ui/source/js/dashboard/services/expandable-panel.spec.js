'use strict';

describe('Dashboard.services.expandablePanel: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('dashboardExpandablePanelService');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "trigger" method', function () {
      expect(typeof service.trigger).toEqual('function');
    });

    it('should have a public "expander" array property', function () {
      expect(service.expander instanceof Array).toEqual(true);
    });

    it('should have a public "collapser" array property', function () {
      expect(service.collapser instanceof Array).toEqual(true);
    });

    it('should have a public "lockFullWith" array property', function () {
      expect(service.lockFullWith instanceof Array).toEqual(true);
    });

    it('should subscribe to events', function () {
      var a = 0;
      var b = 0;
      var c = 0;

      service.expander.push(function () {
        a++;
      });

      service.collapser.push(function () {
        b++;
      });

      service.lockFullWith.push(function () {
        c++;
      });

      service.trigger('expander');
      service.trigger('collapser');
      service.trigger('lockFullWith');

      expect(a + b + c).toEqual(3);
    });
  });
});
