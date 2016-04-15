'use strict';

describe('GraphList.settings: unit tests', function () {
  var settings;

  beforeEach(function () {
    module('listGraph');
  });

  describe('constants', function () {
    // Module `listGraph` needs to be loaded **before** we can inject any
    // constant.
    beforeEach(function () {
      inject(function ($injector) {
        settings = $injector.get('listGraphSettings');
      });
    });

    it('`settings` should be an object', function () {
      expect(typeof settings).toBe('object');
    });

    it('`iconPath` should be a string or undefined', function () {
      if (settings.iconPath) {
        expect(typeof settings.iconPath).toBe('string');
        if (settings.iconPath.length) {
          expect(settings.iconPath.slice(-3)).toBe('svg');
        }
      } else {
        expect(typeof settings.iconPath).toBe('undefined');
      }
    });
  });
});
