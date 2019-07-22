'use strict';

describe('RefineryApp.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryApp');
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
      deps = module.value('refineryApp').requires;
    });

    it('should have "angular-resource" as a dependency', function () {
      expect(hasModule('ngResource')).toEqual(true);
    });

    it('should have "ui.router" as a dependency', function () {
      expect(hasModule('ui.router')).toEqual(true);
    });

    it('should have "file-model" as a dependency', function () {
      expect(hasModule('file-model')).toEqual(true);
    });

    it('should have "colors" as a dependency', function () {
      expect(hasModule('colors')).toEqual(true);
    });

    it('should have "mockParams" as a dependency', function () {
      expect(hasModule('mockParams')).toEqual(true);
    });

    it('should have "replaceWhiteSpaceWithHyphen" as a dependency', function () {
      expect(hasModule('replaceWhiteSpaceWithHyphen')).toEqual(true);
    });

    it('should have "refineryRouter" as a dependency', function () {
      expect(hasModule('refineryRouter')).toEqual(true);
    });

    it('should have "refineryProvvis" as a dependency', function () {
      expect(hasModule('refineryProvvis')).toEqual(true);
    });

    it('should have "refineryHome" as a dependency', function () {
      expect(hasModule('refineryHome')).toEqual(true);
    });

    it('should have "refineryDataSetNav" as a dependency', function () {
      expect(hasModule('refineryDataSetNav')).toEqual(true);
    });

    it('should have "refineryDashboard" as a dependency', function () {
      expect(hasModule('refineryDashboard')).toEqual(true);
    });

    it('should have "refineryAnalysisMonitor" as a dependency', function () {
      expect(hasModule('refineryAnalysisMonitor')).toEqual(true);
    });

    it('should have "refineryFileBrowser" as a dependency', function () {
      expect(hasModule('refineryFileBrowser')).toEqual(true);
    });

    it('should have "refineryDataSetAbout" as a dependency', function () {
      expect(hasModule('refineryDataSetAbout')).toEqual(true);
    });

    it('should have "refineryToolLaunch" as a dependency', function () {
      expect(hasModule('refineryToolLaunch')).toEqual(true);
    });

    it('should have "refineryUserFileBrowser" as a dependency', function () {
      expect(hasModule('refineryUserFileBrowser')).toEqual(true);
    });

    it('should have "refineryWorkflow" as a dependency', function () {
      expect(hasModule('refineryWorkflow')).toEqual(true);
    });

    // Just a negative control to make sure that the test actually works.
    it('should NOT have "notExistingModule" as a dependency', function () {
      expect(hasModule('notExistingModule')).toEqual(false);
    });
  });
});
