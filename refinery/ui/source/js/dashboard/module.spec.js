'use strict';

describe('Dashboard.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDashboard');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });
  });

  describe('Dependencies:', function () {
    var deps;
    var hasModule = function (m) {
      return deps.indexOf(m) >= 0;
    };

    beforeEach(function () {
      deps = module.value('refineryDashboard').requires;
    });

    it('should have "ngAnimate" as a dependency', function () {
      expect(hasModule('ngAnimate')).toEqual(true);
    });

    it('should have "ngSanitize" as a dependency', function () {
      expect(hasModule('ngSanitize')).toEqual(true);
    });

    it('should have "tooltip" as a dependency', function () {
      expect(hasModule('tooltip')).toEqual(true);
    });

    it('should have "angular-intro" as a dependency', function () {
      expect(hasModule('angular-intro')).toEqual(true);
    });
  });
});
