(function () {
  'use strict';

  describe('refineryToolLaunch.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryToolLaunch');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
