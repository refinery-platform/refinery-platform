(function () {
  'use strict';

  describe('refineryWorkflow.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryWorkflow');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
