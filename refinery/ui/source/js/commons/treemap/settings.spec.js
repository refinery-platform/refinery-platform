'use strict';

describe('Treemap.settings: unit tests', function () {
  var settings;

  beforeEach(function () {
    module('treemap');
  });

  describe('constants', function () {
    // Module `treemap` needs to be loaded **before** we can inject any
    // constant.
    beforeEach(function () {
      inject(function ($injector) {
        settings = $injector.get('treemapSettings');
      });
    });

    it('`settings` should be an object', function () {
      expect(typeof settings).toBe('object');
    });

    it('`treemapFadeInDuration` should be a number or undefined', function () {
      if (settings.treemapFadeInDuration) {
        expect(typeof settings.treemapFadeInDuration).toBe('number');
      } else {
        expect(typeof settings.treemapFadeInDuration).toBe('undefined');
      }
    });

    it('`treemapZoomDuration` should be a number or undefined', function () {
      if (settings.treemapZoomDuration) {
        expect(typeof settings.treemapZoomDuration).toBe('number');
      } else {
        expect(typeof settings.treemapZoomDuration).toBe('undefined');
      }
    });

    it('`highlightBGColor` should be a string or undefined', function () {
      if (settings.highlightBGColor) {
        expect(typeof settings.highlightBGColor).toBe('string');
        expect(settings.highlightBGColor.length).toBe(7);
        expect(settings.highlightBGColor[0]).toBe('#');
      } else {
        expect(typeof settings.highlightBGColor).toBe('undefined');
      }
    });

    it('`highlightTextColor` should be a string or undefined', function () {
      if (settings.highlightTextColor) {
        expect(typeof settings.highlightTextColor).toBe('string');
        expect(settings.highlightTextColor.length).toBe(7);
        expect(settings.highlightTextColor[0]).toBe('#');
      } else {
        expect(typeof settings.highlightTextColor).toBe('undefined');
      }
    });
  });
});
