'use strict';

describe('Common.service.node_group: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var validUuid = 'adf45998-304d-41bf-9983-267b5993c9a1';
  var service;
  var settings;
  var uuidResponse = {
    uuid: 'adf45998-304d-41bf-9983-267b5993c9a1',
    node_count: 3,
    is_implicit: false,
    study: '8486046b-22f4-447f-9c81-41dbf6173c44',
    assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
    is_current: false,
    nodes: [
      '910117c5-fda2-4700-ae87-dc897f3a5d85',
      '1a50204d-49fa-4082-a708-26ee93fb0f86',
      '32e977fc-b906-4315-b6ed-6a644d173492'
    ],
    name: 'Node Group 16'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($injector) {
      settings = $injector.get('settings');
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      service = $injector.get('nodeGroupService');
    });
  });

  describe('Service', function () {
    it('should be defined', function () {
      expect(service).toBeDefined();
    });

    it('should be a method', function () {
      expect(typeof service).toEqual('function');
    });

    it('get with uuid should return a resolving promise', function () {
      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 + '/node_groups/?uuid=' + validUuid
        ).respond(200, uuidResponse);

      var results;
      var promise = service.get({
        uuid: validUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      angular.forEach(uuidResponse, function (value, fieldName) {
        expect(uuidResponse[fieldName]).toEqual(results[fieldName]);
      });
    });

    it('query with assay uuid returns a resolving promise', function () {
      var assayUuidResponse = [
        uuidResponse,
        {
          uuid: 'b99c2e6d-88f0-4562-a947-4f11497c18aa',
          node_count: 3,
          is_implicit: false,
          study: '8486046b-22f4-447f-9c81-41dbf6173c44',
          assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
          is_current: false,
          nodes: [
            '910117c5-fda2-4700-ae87-dc897f3a5d85',
            '1a50204d-49fa-4082-a708-26ee93fb0f86',
            '32e977fc-b906-4315-b6ed-6a644d173492'
          ],
          name: 'Node Group 10'
        }
      ];

      $httpBackend
        .expectGET(
          settings.appRoot +
          settings.refineryApiV2 + '/node_groups/?assay=' + validUuid
        ).respond(200, assayUuidResponse);

      var results;
      var promise = service.query({
        assay: validUuid
      }).$promise.then(function (response) {
        results = response;
      });

      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      angular.forEach(assayUuidResponse[0], function (value, fieldName) {
        expect(assayUuidResponse[fieldName]).toEqual(results[fieldName]);
      });
      angular.forEach(assayUuidResponse[1], function (value, fieldName) {
        expect(assayUuidResponse[fieldName]).toEqual(results[fieldName]);
      });
    });

    it('update should return a resolving promise', function () {
      var putParams = {
        uuid: '6b0d1b79-8f5d-4ae7-a874-f4d8b6746dcd',
        is_current: false,
        nodes: [
          '910117c5-fda2-4700-ae87-dc897f3a5d85',
          '1a50204d-49fa-4082-a708-26ee93fb0f86',
          '32e977fc-b906-4315-b6ed-6a644d173492'
        ]
      };
      var putResponse = {
        uuid: '6b0d1b79-8f5d-4ae7-a874-f4d8b6746dcd',
        node_count: 3,
        is_implicit: false,
        study: '8486046b-22f4-447f-9c81-41dbf6173c44',
        assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
        is_current: false,
        nodes: [
          '910117c5-fda2-4700-ae87-dc897f3a5d85',
          '1a50204d-49fa-4082-a708-26ee93fb0f86',
          '32e977fc-b906-4315-b6ed-6a644d173492'
        ],
        name: 'Node Group 15'
      };
      $httpBackend
        .expectPUT(
          settings.appRoot +
          settings.refineryApiV2 + '/node_groups/',
          putParams
        ).respond(200, putResponse);

      var results;
      var promise = service.update(putParams).$promise.then(function (response) {
        results = response;
      });
      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      angular.forEach(putResponse, function (value, fieldName) {
        expect(putResponse[fieldName]).toEqual(results[fieldName]);
      });
    });

    it('save should return a resolving promise', function () {
      var postParams = {
        name: 'Test Node Group 1',
        study: '8486046b-22f4-447f-9c81-41dbf6173c44',
        assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
        is_current: false,
        nodes: [
          '910117c5-fda2-4700-ae87-dc897f3a5d85',
          '1a50204d-49fa-4082-a708-26ee93fb0f86',
          '32e977fc-b906-4315-b6ed-6a644d173492'
        ]
      };
      var postResponse = {
        uuid: '6b0d1b79-8f5d-4ae7-a874-f4d8b6746dcd',
        node_count: 3,
        is_implicit: false,
        study: '8486046b-22f4-447f-9c81-41dbf6173c44',
        assay: '2a3c4155-db7b-4138-afcb-67ad1cc04d51',
        is_current: false,
        nodes: [
          '910117c5-fda2-4700-ae87-dc897f3a5d85',
          '1a50204d-49fa-4082-a708-26ee93fb0f86',
          '32e977fc-b906-4315-b6ed-6a644d173492'
        ],
        name: 'Test Node Group 1'
      };
      $httpBackend
        .expectPOST(
          settings.appRoot +
          settings.refineryApiV2 + '/node_groups/',
          postParams
        ).respond(200, postResponse);

      var results;
      var promise = service.save(postParams).$promise.then(function (response) {
        results = response;
      });
      expect(typeof promise.then).toEqual('function');
      $httpBackend.flush();
      $rootScope.$digest();
      angular.forEach(postResponse, function (value, fieldName) {
        expect(postResponse[fieldName]).toEqual(results[fieldName]);
      });
    });
  });
});
