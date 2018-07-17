'use strict';

describe('Common.service.addFileToDataSetService: unit tests', function () {
  var httpBackend;
  var scope;
  var mockUuid = '';
  var service;
  var refinerySettings;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryDataSetImport'));
  beforeEach(inject(function (
    $httpBackend,
    $rootScope,
    addFileToDataSetService,
    mockParamsFactory,
    settings
  ) {
    refinerySettings = settings;
    httpBackend = $httpBackend;
    scope = $rootScope;
    service = addFileToDataSetService;
    mockUuid = mockParamsFactory.generateUuid();
  }));

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('patch should return a resolving promise', function () {
      var param = { data_set_uuid: mockUuid };
      var mockResponse = { data: 'success update' };
      httpBackend
        .expectPOST(
          refinerySettings.appRoot +
          refinerySettings.refineryApiV2 +
          '/data_set_manager/add-file/?format=json',
          param
      ).respond(202, mockResponse);

      var results;
      var promise = service.update(param).$promise
        .then(function (response) {
          results = response;
        });

      expect(typeof promise.then).toEqual('function');
      httpBackend.flush();
      scope.$digest();
      expect(results.status).toEqual(mockResponse.status);
      expect(results.data).toEqual(mockResponse.data);
    });
  });
});
