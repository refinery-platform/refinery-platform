// UNIT TESTING
'use strict';

describe('File Upload Status Service', function () {
  var service;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));
  beforeEach(inject(function (_fileUploadStatusService_) {
    service = _fileUploadStatusService_;
  }));

  it('service and variables should exist', function () {
    expect(service).toBeDefined();
    expect(service.fileUploadStatus).toEqual('none');
  });

  it('setFileUploadStatus is a method', function () {
    expect(angular.isFunction(service.setFileUploadStatus)).toBe(true);
  });

  it('setFileUploadStatus sets fileUploadStatus with correct inputs', function () {
    expect(service.fileUploadStatus).toEqual('none');
    expect(service.setFileUploadStatus('running')).toEqual('running');
    expect(service.setFileUploadStatus('queuing')).toEqual('queuing');
    expect(service.setFileUploadStatus('none')).toEqual('none');
  });

  it('setFileUploadStatus does not set fileUploadStatus', function () {
    expect(service.fileUploadStatus).toEqual('none');
    expect(service.setFileUploadStatus('nothing')).toEqual('none');
    expect(service.setFileUploadStatus('')).toEqual('none');
  });
});
