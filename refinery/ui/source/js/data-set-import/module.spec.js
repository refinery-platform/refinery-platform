'use strict';

describe('DataSetImport.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryDataSetImport');
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
      deps = module.value('refineryDataSetImport').requires;
    });

    it('should have "ngFileUpload" as a dependency', function () {
      expect(hasModule('ngFileUpload')).toEqual(true);
    });

    it('should have "blueimp.fileupload" as a dependency', function () {
      expect(hasModule('blueimp.fileupload')).toEqual(true);
    });

    it('should have "ui.grid" as a dependency', function () {
      expect(hasModule('ui.grid')).toEqual(true);
    });

    it('should have "ui.grid.edit" as a dependency', function () {
      expect(hasModule('ui.grid.edit')).toEqual(true);
    });

    it('should have "ui.grid.resizeColumns" as a dependency', function () {
      expect(hasModule('ui.grid.resizeColumns')).toEqual(true);
    });
  });
});
