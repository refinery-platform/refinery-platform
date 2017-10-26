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

    it('should have "ngResource" as a dependency', function () {
      expect(hasModule('ngResource')).toEqual(true);
    });

    it('should have "ui.router" as a dependency', function () {
      expect(hasModule('ui.router')).toEqual(true);
    });

    it('should have "file-model" as a dependency', function () {
      expect(hasModule('file-model')).toEqual(true);
    });

    it('should have "ngWebworker" as a dependency', function () {
      expect(hasModule('ngWebworker')).toEqual(true);
    });

    it('should have "pubSub" as a dependency', function () {
      expect(hasModule('pubSub')).toEqual(true);
    });

    it('should have "closeOnOuterClick" as a dependency', function () {
      expect(hasModule('closeOnOuterClick')).toEqual(true);
    });

    it('should have "colors" as a dependency', function () {
      expect(hasModule('colors')).toEqual(true);
    });

    it('should have "focusOn" as a dependency', function () {
      expect(hasModule('focusOn')).toEqual(true);
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

    it('should have "refineryStatistics" as a dependency', function () {
      expect(hasModule('refineryStatistics')).toEqual(true);
    });

    it('should have "refineryProvvis" as a dependency', function () {
      expect(hasModule('refineryProvvis')).toEqual(true);
    });

    it('should have "refineryDataSetImport" as a dependency', function () {
      expect(hasModule('refineryDataSetImport')).toEqual(true);
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

    it('should have "refineryCollaboration" as a dependency', function () {
      expect(hasModule('refineryCollaboration')).toEqual(true);
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

    // Just a negative control to make sure that the test actually works.
    it('should NOT have "notExistingModule" as a dependency', function () {
      expect(hasModule('notExistingModule')).toEqual(false);
    });
  });
});
