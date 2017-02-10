(function () {
  'use strict';

  describe('refineryTools.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryTools');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
