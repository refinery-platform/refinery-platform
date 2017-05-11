(function () {
  'use strict';

  describe('Tool Launch Service', function () {
    // var deferred;
    // var rootScope;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (toolLaunchService) {
      service = toolLaunchService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('setSelectedTool is a method', function () {
      expect(angular.isFunction(service.postToolLaunch)).toBe(true);
    });

    // describe('getTools', function () {
    //  beforeEach(inject(function (toolDefinitionsService, $q, $rootScope) {
    //    var responseData = [{ name: 'Test Workflow' }];
    //    spyOn(toolDefinitionsService, 'query').and.callFake(function () {
    //      deferred = $q.defer();
    //      deferred.resolve(responseData);
    //      return { $promise: deferred.promise };
    //    });
    //    rootScope = $rootScope;
    //  }));
    //
    //  it('getTools is a method', function () {
    //    expect(angular.isFunction(service.getTools)).toBe(true);
    //  });
    //
    //  it('getTools returns a promise', function () {
    //    var successData;
    //    var response = service
    //      .getTools()
    //      .then(function (responseData) {
    //        successData = responseData[0].name;
    //      });
    //    rootScope.$apply();
    //    expect(typeof response.then).toEqual('function');
    //    expect(successData).toEqual('Test Workflow');
    //  });
    // });
  });
})();
