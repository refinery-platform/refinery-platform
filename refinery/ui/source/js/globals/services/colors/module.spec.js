describe('Colors.module: unit tests', function () {
  'use strict';

  var module;

  beforeEach(function () {
    module = angular.module('colors');
  });

  describe('Module', function () {

    it('should be registered', function () {
      expect(!!module).toEqual(true);
    });

  });

  describe('Dependencies:', function () {

    var deps,
        hasModule = function (m) {
          return deps.indexOf(m) >= 0;
        };

    beforeEach(function () {
      deps = module.value('colors').requires;
    });

    // Example
    // it('should have "ngAnimate" as a dependency', function () {
    //   expect(hasModule('ngAnimate')).toEqual(true);
    // });

  });
});
