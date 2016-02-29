//UNIT TESTING
//Provide a global variable for factory.
var csrf_token;
describe("File Browser Factory", function(){
 // 'use strict';
  var factory,
      query,
      deferred,
      rootScope,
      valid_uuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x',
      valid_token = 'xxxx1';

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryFileBrowser'));
  beforeEach(inject( function(_fileBrowserFactory_){
    factory = _fileBrowserFactory_;
    csrf_token = valid_token;
  }));

  it('factory and tools variables should exist', function(){
    expect(factory).toBeDefined();
    expect(factory.assayFiles).toEqual([]);
    expect(factory.assayAttributes).toEqual([]);
  });

  describe("getAssayFiles", function() {
    var assayFiles;

    beforeEach(inject( function(assayFileService, $q, $rootScope){
      assayFiles = [{test1:1},{test2:2},{test3:3},{test4:4}];
      spyOn(assayFileService, "query").and.callFake(function() {
        deferred = $q.defer();
        deferred.resolve(assayFiles);
        return {$promise : deferred.promise};
      });
      rootScope = $rootScope;
    }));

    it('getAssayFiles is a method', function () {
      expect(angular.isFunction(factory.getAssayFiles)).toBe(true);
    });

    it('getAssayFiles returns a promise', function () {
      var successData;
      var response = factory.getAssayFiles({uuid: valid_uuid}).then(function (responseData) {
        successData = responseData;
      });
      rootScope.$apply();
      expect(typeof response.then).toEqual('function');
      expect(angular.isFunction(factory.getAssayFiles)).toBe(true);
      expect(successData).toEqual(assayFiles);
    });
  });

  describe("getAssayAttributes", function() {
    var $httpBackend, settings, responseData, url;

    beforeEach(inject(function(_$httpBackend_,_settings_) {
      $httpBackend = _$httpBackend_;
      settings = _settings_;
      responseData = [
        {
          "assay": 3,
          "study": 6,
          "solr_field": "is_annotation",
          "rank": 0,
          "is_exposed": true,
          "is_facet": true,
          "is_active": false,
          "is_internal": true,
          "id": 49
        },
        {
          "assay": 3,
          "study": 6,
          "solr_field": "study_uuid",
          "rank": 0,
          "is_exposed": true,
          "is_facet": false,
          "is_active": false,
          "is_internal": true,
          "id": 51
        },
        {
          "assay": 3,
          "study": 6,
          "solr_field": "type",
          "rank": 0,
          "is_exposed": true,
          "is_facet": true,
          "is_active": false,
          "is_internal": true,
          "id": 54
        }
      ];
      url = settings.appRoot + settings.refineryApiV2 + '/assays/:uuid/attributes/';
    }));

    it('getAssayAttributes is a method', function () {
      expect(angular.isFunction(factory.getAssayAttributes)).toBe(true);
    });

    it('getAssayAttributes makes success call', function () {
      var data;
      $httpBackend.expect(
        'GET',
        url,
        {'csrfmiddlewaretoken': valid_token, 'uuid': valid_uuid},
        {"Accept":"application/json, text/plain, */*"}
      ).respond(200, {}, {});
      var response = factory.getAssayAttributes(valid_uuid).then(function(){
        data = 'SUCCESS';
      }, function(){
        data = 'ERROR';
      });
      $httpBackend.flush();
      expect(typeof response.then).toEqual('function');
      expect(data).toEqual('SUCCESS');
    });
  });
});
