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

    describe('generateFileStr', function () {
      it('generateFileStr is a method', function () {
        expect(angular.isFunction(service.generateFileStr)).toBe(true);
      });

      it('returns the correct basic LIST str with uuid', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('[]');
        var mockerInputTypeUuid = mocker.generateUuid();
        var mockUuid = mocker.generateUuid();
        var workflow = ['LIST'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy({ uuid: mockerInputTypeUuid });
        fileService.groupCollection['0'] = {};
        fileService.groupCollection['0'][mockerInputTypeUuid] = angular.copy([{ uuid: mockUuid }]);
        var responseStr = service.generateFileStr();

        expect(responseStr).toEqual('[' + mockUuid + ']');
      });

      it('returns the correct basic PAIR str with uuids', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('()');
        var mockerInputTypeUuid = mocker.generateUuid();
        var mockUuid = mocker.generateUuid();
        var workflow = ['PAIR'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy({ uuid: mockerInputTypeUuid });
        fileService.groupCollection['0'] = {};
        fileService.groupCollection['0'][mockerInputTypeUuid] = angular.copy([{ uuid: mockUuid }]);
        var responseStr = service.generateFileStr();

        expect(responseStr).toEqual('(' + mockUuid + ')');
      });

      it('returns the correct basic LIST:PAIR str with uuids', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('[()()()]');
        var mockerInputTypeUuid0 = mocker.generateUuid();
        var mockerInputTypeUuid1 = mocker.generateUuid();
        var mockUuid0 = mocker.generateUuid();
        var mockUuid1 = mocker.generateUuid();
        var mockUuid2 = mocker.generateUuid();
        var mockUuid3 = mocker.generateUuid();
        var workflow = ['LIST', 'PAIR'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy({ uuid: mockerInputTypeUuid0 });
        fileService.inputFileTypes[1] = angular.copy({ uuid: mockerInputTypeUuid1 });
        fileService.groupCollection['0,0'] = {};
        fileService.groupCollection['0,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid0 }]
        );
        fileService.groupCollection['0,0'][mockerInputTypeUuid1] = angular.copy(
          [{ uuid: mockUuid1 }]
        );
        fileService.groupCollection['1,0'] = {};
        fileService.groupCollection['1,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid2 }]
        );
        fileService.groupCollection['1,0'][mockerInputTypeUuid1] = angular.copy(
          [{ uuid: mockUuid3 }]
        );
        fileService.groupCollection['2,0'] = {};
        fileService.groupCollection['2,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid1 }]
        );
        fileService.groupCollection['2,0'][mockerInputTypeUuid1] = angular.copy(
          [{ uuid: mockUuid2 }]
        );

        var responseStr = service.generateFileStr();
        var expectStr = '[' + '(' + mockUuid0 + ',' + mockUuid1 + '),' +
          '(' + mockUuid2 + ',' + mockUuid3 + '),' +
          '(' + mockUuid1 + ',' + mockUuid2 + ')' + ']';

        expect(responseStr).toEqual(expectStr);
      });

      it('returns the correct basic PAIR:LIST str with uuids', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('([][])');
        var mockerInputTypeUuid0 = mocker.generateUuid();
        var mockUuid0 = mocker.generateUuid();
        var mockUuid1 = mocker.generateUuid();
        var workflow = ['PAIR', 'LIST'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy(
          { uuid: mockerInputTypeUuid0 }
        );
        fileService.groupCollection['0,0'] = {};
        fileService.groupCollection['0,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid0 }]
        );
        fileService.groupCollection['1,0'] = {};
        fileService.groupCollection['1,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid1 }]
        );

        var responseStr = service.generateFileStr();
        var expectStr = '(' + '[' + mockUuid0 + '],' + '[' + mockUuid1 + ']' + ')';

        expect(responseStr).toEqual(expectStr);
      });

      it('returns the correct basic LIST:LIST str with uuids', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('[[][]]');
        var mockerInputTypeUuid0 = mocker.generateUuid();
        var mockUuid0 = mocker.generateUuid();
        var mockUuid1 = mocker.generateUuid();
        var mockUuid2 = mocker.generateUuid();
        var mockUuid3 = mocker.generateUuid();
        var workflow = ['LIST', 'LIST'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy({ uuid: mockerInputTypeUuid0 });
        fileService.groupCollection['0,0'] = {};
        fileService.groupCollection['0,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid0 }, { uuid: mockUuid1 }]
        );
        fileService.groupCollection['1,0'] = {};
        fileService.groupCollection['1,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid2 }, { uuid: mockUuid3 }]
        );

        var responseStr = service.generateFileStr();
        var expectStr = '[' + '[' + mockUuid0 + ',' + mockUuid1 + '],' +
          '[' + mockUuid2 + ',' + mockUuid3 + ']' + ']';

        expect(responseStr).toEqual(expectStr);
      });

      it('returns the correct basic LIST:LIST:LIST str with uuids', function () {
        spyOn(service, 'generateFileTemplate').and.returnValue('[[[][]][[][]]]');
        var mockerInputTypeUuid0 = mocker.generateUuid();
        var mockUuid0 = mocker.generateUuid();
        var mockUuid1 = mocker.generateUuid();
        var mockUuid2 = mocker.generateUuid();
        var workflow = ['LIST', 'LIST', 'LIST'];
        angular.copy(workflow, fileService.currentTypes);
        fileService.inputFileTypes[0] = angular.copy({ uuid: mockerInputTypeUuid0 });
        fileService.groupCollection['0,0,0'] = {};
        fileService.groupCollection['0,0,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid0 }]
        );
        fileService.groupCollection['1,0,0'] = {};
        fileService.groupCollection['1,0,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid1 }]
        );
        fileService.groupCollection['1,1,0'] = {};
        fileService.groupCollection['1,1,0'][mockerInputTypeUuid0] = angular.copy(
          [{ uuid: mockUuid1 }, { uuid: mockUuid2 }]
        );

        var responseStr = service.generateFileStr();
        var expectStr = '[[[' + mockUuid0 + ']]' + ',[[' + mockUuid1 + '],' +
          '[' + mockUuid1 + ',' + mockUuid2 + ']]]';

        expect(responseStr).toEqual(expectStr);
      });
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
        groupCollection['0'] = angular.copy(inputFileObj);
        groupCollection['1'] = angular.copy(inputFileObj);
        groupCollection['2'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[()()()]');
      });

      it('returns the correct pair:list template', function () {
        var workflow = ['PAIR', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0'] = angular.copy(inputFileObj);
        groupCollection['1'] = angular.copy(inputFileObj);
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
        groupCollection['0'] = angular.copy(inputFileObj);
        groupCollection['1'] = angular.copy(inputFileObj);
        groupCollection['2'] = angular.copy(inputFileObj);
        groupCollection['3'] = angular.copy(inputFileObj);
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
        groupCollection['0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 0'] = angular.copy(inputFileObj);
        groupCollection['3, 0'] = angular.copy(inputFileObj);
        groupCollection['3, 1'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate).toEqual('[[[]][[]][[]][[][]]]');
      });

      it('returns the correct pair:pair:pair template with multiple lists', function () {
        var workflow = ['PAIR', 'PAIR', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0'] = angular.copy(inputFileObj);
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
        groupCollection['0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['0, 1, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate)
          .toEqual('(([()][()])([()][()()]))');
      });

      it('returns the correct complicated template, starting w/ pair', function () {
        var workflow = ['PAIR', 'PAIR', 'LIST', 'LIST', 'PAIR'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['0, 1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 1'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 1, 2'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate)
          .toEqual('(' +
            '([[()]][[()]])([[()]][[()][()()()]])' +
            ')');
      });

      it('returns the correct complicated template starting w/ list', function () {
        var workflow = ['LIST', 'LIST', 'PAIR', 'LIST', 'PAIR', 'LIST'];
        var inputFileObj = {};
        inputFileObj[mocker.generateUuid()] = [mocker.generateUuid()];
        var groupCollection = {};
        groupCollection['0, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['0, 1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['1, 1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 0, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 1, 0, 0, 0'] = angular.copy(inputFileObj);
        groupCollection['2, 1, 0, 0, 0'] = angular.copy(inputFileObj);
        angular.copy(workflow, fileService.currentTypes);
        angular.copy(groupCollection, fileService.groupCollection);
        var responseTemplate = service.generateFileTemplate();
        expect(responseTemplate)
          .toEqual('[' +
            '[([([][])][([][])])([([][])][([][])])]' +
            '[([([][])][([][])])([([][])][([][])])]' +
            '[([([][])][([][])])([([][])][([][])])]' +
            ']');
      });
    });

    describe('checkNeedMoreNodes from Ctrl', function () {
      it('checkNeedMoreNodes is method', function () {
        expect(angular.isFunction(service.checkNeedMoreNodes)).toBe(true);
      });

      it('checkNeedMoreNodes returns false for filled pairs', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[fileService.currentGroup] = angular.copy({});
        fileService.groupCollection[fileService.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        fileService.groupCollection[fileService.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(service.checkNeedMoreNodes()).toEqual(false);
      });

      it('checkNeedMoreNodes returns false for filled list', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'LIST']);
        fileService.groupCollection[fileService.currentGroup] = angular.copy({});
        fileService.groupCollection[fileService.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(service.checkNeedMoreNodes()).toEqual(false);
      });

      it('checkNeedMoreNodes returns true if currentGroup is empty', function () {
        // default is empty
        expect(service.checkNeedMoreNodes()).toEqual(true);
      });

      it('checkNeedMoreNodes returns true for partial filled pair - input type', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[fileService.currentGroup] = angular.copy({});
        fileService.groupCollection[fileService.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        expect(service.checkNeedMoreNodes()).toEqual(true);
      });

      it('checkNeedMoreNodes returns true for partial filled pair - missing node', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'PAIR']);
        fileService.groupCollection[fileService.currentGroup] = angular.copy({});
        fileService.groupCollection[fileService.currentGroup][mocker.generateUuid()] =
          angular.copy([mocker.generateUuid()]);
        fileService.groupCollection[fileService.currentGroup]
          [mocker.generateUuid()] = angular.copy([]);
        expect(service.checkNeedMoreNodes()).toEqual(true);
      });

      it('checkNeedMoreNodes returns true for partial filled list - missing node', function () {
        fileService.currentGroup = angular.copy([0, 0]);
        fileService.currentTypes = angular.copy(['LIST', 'LIST']);
        fileService.groupCollection[fileService.currentGroup] = angular.copy({});
        fileService.groupCollection[fileService.currentGroup]
          [mocker.generateUuid()] = angular.copy([]);
        expect(service.checkNeedMoreNodes()).toEqual(true);
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

