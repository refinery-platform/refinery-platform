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
});
