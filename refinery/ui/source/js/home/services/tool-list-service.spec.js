(function () {
  'use strict';

  describe('Tool List Service', function () {
    var factory;
    var toolService;
    var rootScope;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryHome'));
    beforeEach(inject(function (
      $rootScope,
      toolDefinitionsService,
      toolListService
    ) {
      factory = toolListService;
      toolService = toolDefinitionsService;
      rootScope = $rootScope;
    }));

    it('factory and tools variables should exist', function () {
      expect(factory).toBeDefined();
      expect(factory.toolList).toEqual([]);
    });

    describe('getTools', function () {
      var toolsResponse;
      var q;

      beforeEach(inject(function (
        $q,
        $rootScope
      ) {
        q = $q;
        toolsResponse = [{ name: 'HiGlass' }];

        spyOn(toolService, 'query').and.callFake(function () {
          var deferred = q.defer();
          deferred.resolve(toolsResponse);
          return {
            $promise: deferred.promise
          };
        });

        rootScope = $rootScope;
      }));

      it('getTools is a method', function () {
        expect(angular.isFunction(factory.getTools)).toBe(true);
      });

      it('getTools returns a promise', function () {
        var successData;
        var response = factory.getTools().then(function (responseData) {
          successData = responseData;
        });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(successData[0].name).toEqual(toolsResponse[0].name);
      });
    });
  });
})();
