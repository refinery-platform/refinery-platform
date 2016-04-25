'use strict';

describe('refinerFileBrowser.module: unit tests', function () {
  var module;

  beforeEach(function () {
    module = angular.module('refineryFileBrowser');
  });

  describe('Module', function () {
    it('should be registered', function () {
      expect(module).not.toEqual(null);
    });

    describe('Dependencies:', function () {
      var deps;
      var hasModule = function (m) {
        return deps.indexOf(m) >= 0;
      };

      beforeEach(function () {
        deps = module.value('refineryApp').requires;
      });

      it('should have "ui.grid" as a dependency', function () {
        expect(hasModule('ui.grid')).toEqual(true);
      });

      it('should have "ui.grid.selection" as a dependency', function () {
        expect(hasModule('ui.grid.selection')).toEqual(true);
      });

      it('should have "ui.grid.infiniteScroll" as a dependency', function () {
        expect(hasModule('ui.grid.infiniteScroll')).toEqual(true);
      });

      it('should have "ui.grid.resizeColumns" as a dependency', function () {
        expect(hasModule('ui.grid.resizeColumns')).toEqual(true);
      });

      it('should have "dndLists" as a dependency', function () {
        expect(hasModule('dndLists')).toEqual(true);
      });
    });
  });
});
