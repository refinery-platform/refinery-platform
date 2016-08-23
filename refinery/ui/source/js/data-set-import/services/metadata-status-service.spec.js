// UNIT TESTING
'use strict';

describe('Metadata Status Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));
  beforeEach(inject(function (_metadataStatusService_) {
    service = _metadataStatusService_;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.metadataPreviewStatus).toEqual(false);
  });

  it('setMetadataPreviewStatus is a method', function () {
    expect(angular.isFunction(service.setMetadataPreviewStatus)).toBe(true);
  });

  it('setFileUploadStatus sets metadataPreviewStatus', function () {
    expect(service.metadataPreviewStatus).toEqual(false);
    service.setMetadataPreviewStatus(true);
    expect(service.metadataPreviewStatus).toEqual(true);
  });

  it('setFileUploadStatus does not set metadataPreviewStatus', function () {
    expect(service.metadataPreviewStatus).toEqual(false);
    service.setMetadataPreviewStatus('true');
    expect(service.metadataPreviewStatus).toEqual(false);
  });
});
