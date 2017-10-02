'use strict';

describe('Constant: LocationTest', function () {
  var locationTest;

  beforeEach(function () {
    module('refineryApp');
    module('refineryRouter');

    inject(function ($injector) {
      locationTest = $injector.get('locationTest');
    });
  });

  it('locationTest should exist', function () {
    expect(locationTest).toBeDefined();
  });

  it('should return true when matchpath is found', function () {
    expect(
      locationTest('www.refinery.com', 'www.refinery.com', 'true')
    ).toBe(true);

    expect(
      locationTest('www.refinery.com', 'www.refinery.com', 'false')
    ).toBe(true);

    expect(
      locationTest('www.refinery.com/datasets/',
        'http://192.168.50.50:8000/provenance/' +
        '88d03196-0d41-42c7-9f16-4cf03657db07/#/' +
        'files/browse', 'true')
    ).toBe(false);

    expect(
      locationTest('www.refinery.com/analyses', 'analyses', 'false')
    ).toBe(true);
  });

  it('should return false when matchpath not found', function () {
    expect(
      locationTest('www.refinery.com', 'www.refinery.com/#browse', 'false')
    ).toBe(false);

    expect(
      locationTest('http://192.168.50.50:8000/provenance/' +
        '88d03196-0d41-42c7-9f16-4cf03657db07/#/' +
        'files/browse', 'www.refinery.com/dataset/', 'false')
    ).toBe(false);

    expect(
      locationTest('www.refinery.com/dataset/',
        'http://192.168.50.50:8000/provenance/' +
        '88d03196-0d41-42c7-9f16-4cf03657db07/#/' +
        'files/browse', 'true')
    ).toBe(false);

    expect(
      locationTest('www.refinery.com/analyses', 'dataset', 'false')
    ).toBe(false);
  });
});
