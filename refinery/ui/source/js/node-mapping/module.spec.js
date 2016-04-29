'use strict';

describe('RefineryNodeMapping.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryNodeMapping');
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
      deps = module.value('refineryNodeMapping').requires;
    });

    it('should have "ngResource" as a dependency', function () {
      expect(hasModule('ngResource')).toEqual(true);
    });

    it('should have "refineryWorkflows" as a dependency', function () {
      expect(hasModule('refineryWorkflows')).toEqual(true);
    });

    it('should have "ui.bootstrap" as a dependency', function () {
      expect(hasModule('ui.bootstrap')).toEqual(true);
    });

    it('should have "ui.router" as a dependency', function () {
      expect(hasModule('ui.router')).toEqual(true);
    });

    it('should have "ui.select" as a dependency', function () {
      expect(hasModule('ui.select')).toEqual(true);
    });
  });
});
