/**
 * Created by scott on 7/25/16.
 */
'use strict';

describe('Dashboard.services.updateUserTutorials: unit tests', function () {
  var service;

  beforeEach(function () {
    module('refineryApp');
    module('refineryDashboard');

    inject(function ($injector) {
      service = $injector.get('updateUserTutorials');
    });
  });

  describe('Service', function () {
    it('should be available', function () {
      expect(!!service).toEqual(true);
    });

    it('should have a public "updateUser" method', function () {
      expect(typeof service.updateUser).toEqual('function');
    });
  });
});
