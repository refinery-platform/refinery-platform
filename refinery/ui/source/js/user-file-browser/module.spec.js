(function () {
  'use strict';

  describe('refineryUserFileBrowser.module: unit tests', function () {
    var module;

    beforeEach(function () {
      module = angular.module('refineryUserFileBrowser');
    });

    describe('Module', function () {
      it('should be registered', function () {
        expect(module).not.toEqual(null);
      });
    });
  });
})();
