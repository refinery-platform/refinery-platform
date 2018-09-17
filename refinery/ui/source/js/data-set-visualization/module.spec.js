(function () {
  'use strict';

  describe('refineryDataSetVisualization.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryDataSetVisualization');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
