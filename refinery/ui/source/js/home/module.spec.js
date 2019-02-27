(function () {
  'use strict';
  describe('refineryHome.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryHome');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
