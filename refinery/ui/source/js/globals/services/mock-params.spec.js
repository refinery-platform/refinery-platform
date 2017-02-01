'use strict';

describe('mockParamsFactory: unit tests', function () {
  var factory;

  beforeEach(module('mockParams'));
  beforeEach((inject(function (_mockParamsFactory_) {
    factory = _mockParamsFactory_;
  })));

  it('should contain the mockParams factory', function () {
    expect(factory).not.toEqual(null);
  });

  it('should contain the uuid method', function () {
    expect(angular.isFunction(factory.generateUuid)).toBe(true);
  });

  it('generateUuid should return length 36', function () {
    var uuid = factory.generateUuid();
    expect(uuid.length).toEqual(36);
    expect(uuid[8]).toEqual('-');
    expect(uuid[13]).toEqual('-');
    expect(uuid[18]).toEqual('-');
    expect(uuid[23]).toEqual('-');
  });
});
