// UNIT TESTING
'use strict';

describe('Import Confirmation Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));
  beforeEach(inject(function (_importConfirmationService_) {
    service = _importConfirmationService_;
  }));

  it('service should exist', function () {
    expect(service).toBeDefined();
  });

  it('showConfirmation is a method', function () {
    expect(angular.isFunction(service.showConfirmation)).toBe(true);
  });
});
