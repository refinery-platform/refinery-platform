(function () {
  'use strict';

  describe('refineryProvvis.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryProvvis');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
