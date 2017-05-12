(function () {
  'use strict';

  describe('Tool Launch Service', function () {
    var fileService;
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      fileRelationshipService,
      mockParamsFactory,
      toolLaunchService
    ) {
      service = toolLaunchService;
      fileService = fileRelationshipService;
      mocker = mockParamsFactory;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
    });

    it('postToolLaunch is a method', function () {
      expect(angular.isFunction(service.postToolLaunch)).toBe(true);
    });

    describe('generateFileTemplate', function () {
      it('generateFileTemplate is a method', function () {
        expect(angular.isFunction(service.generateFileTemplate)).toBe(true);
      });

      it('returns the correct basic list template', function () {
        var workflow = ['LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[]');
      });

      it('returns the correct basic pair template', function () {
        var workflow = ['PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();

        expect(responseTemplate).toEqual('()');
      });

      it('returns the correct list:pair template with multiple pairs', function () {
        var workflow = ['LIST', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0,0'] = angular.copy(inputFileObj);
        groupCollection['1,0'] = angular.copy(inputFileObj);
        groupCollection['2,0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[()()()]');
      });

      it('returns the correct pair:list template with multiple pairs', function () {
        var workflow = ['PAIR', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0,0'] = angular.copy(inputFileObj);
        groupCollection['1,0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('([][])');
      });

      it('returns the correct pair:pair:list:pair template with multiple' +
        ' pairs', function () {
        var workflow = ['PAIR', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0,0'] = angular.copy(inputFileObj);
        groupCollection['1,0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('([][])');
      });

      it('returns the correct list list template with multiple lists', function () {
        var workflow = ['LIST', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 0'] = angular.copy(inputFileObj);
        groupCollection['3, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[[][][][]]');
      });

      it('returns the correct list:list:list template with multiple lists', function () {
        var workflow = ['LIST', 'LIST', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['3, 0, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[[[]][[]][[]][[]]]');
      });

      it('returns the correct pair:pair:pair template with multiple lists', function () {
        var workflow = ['PAIR', 'PAIR', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('((()())(()()))');
      });

      it('returns the correct complicated template', function () {
        var workflow = ['PAIR', 'PAIR', 'LIST', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        // empty sets are removed in another method
        expect(responseTemplate)
          .toEqual('(([()()][()()])([()()][()()]))');
      });

      it('returns the correct complicated template, for many groups', function () {
        var workflow = ['PAIR', 'PAIR', 'LIST', 'LIST', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 1, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 2, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        // empty sets are removed in another method
        expect(responseTemplate)
          .toEqual('(' +
            '([[()()()][()()()]][[()()()][()()()]])' +
            '([[()()()][()()()]][[()()()][()()()]])' +
            ')');
      });

      it('returns the correct complicated template', function () {
        var workflow = ['LIST', 'LIST', 'PAIR', 'LIST', 'PAIR', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['0, 1, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 0, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        // empty sets are removed in another method
        expect(responseTemplate)
          .toEqual('[' +
            '[([([][])][([][])])([([][])][([][])])]' +
            '[([([][])][([][])])([([][])][([][])])]' +
            '[([([][])][([][])])([([][])][([][])])]' +
            ']');
      });
    });

    describe('postToolLaunch', function () {
      var deferred;
      var rootScope;

      beforeEach(inject(function (toolsService, $q, $rootScope) {
        var responseData = { status: 'success' };
        spyOn(toolsService, 'save').and.callFake(function () {
          deferred = $q.defer();
          deferred.resolve(responseData);
          return { $promise: deferred.promise };
        });
        rootScope = $rootScope;
      }));

      it('postToolLaunch is a method', function () {
        expect(angular.isFunction(service.postToolLaunch)).toBe(true);
      });

      it('postToolLaunch returns a promise', function () {
        angular.copy(['LIST'], fileService.currentTypes);
        var responseStatus;
        var response = service
          .postToolLaunch()
          .then(function (responseData) {
            responseStatus = responseData.status;
          });
        rootScope.$apply();
        expect(typeof response.then).toEqual('function');
        expect(responseStatus).toEqual('success');
      });
    });
  });
})();

