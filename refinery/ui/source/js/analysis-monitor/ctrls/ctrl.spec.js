'use strict';

describe('Controller: AnalysisMonitorCtrl', function () {
  var ctrl;
  var factory;
  var fakeUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  var fakeInvalidUuid = 'xxxxx';
  var timeout;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryAnalysisMonitor'));
  beforeEach(inject(function (
    $controller, $rootScope, $timeout, $window, analysisMonitorFactory
  ) {
    ctrl = $controller('AnalysisMonitorCtrl', {
      $scope: $rootScope.$new()
    });
    factory = analysisMonitorFactory;
    $window.dataSetUuid = 'x508x83x-x9xx-4740-x9x7-x7x0x631280x';
  }));

  it('AnalysisMonitorCtrl ctrl should exist', function () {
    expect(ctrl).toBeDefined();
  });

  it('Data & UI displays variables should exist for views', function () {
    expect(ctrl.analysesList).toEqual([]);
    expect(ctrl.analysesDetail).toEqual({});
    expect(ctrl.analysesRunningList).toEqual([]);
    expect(ctrl.launchAnalysisFlag).toBeDefined();
    expect(ctrl.analysesLoadingFlag).toBeDefined();
    expect(ctrl.initializedFlag).toBeDefined();
  });

  describe('Update Analyse Lists from Factory', function () {
    it('updateAnalysesList is method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesList)).toBe(true);
    });

    it('updateAnalysesList sets timer and returns promise', function () {
      var mockAnalysesFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerList).toEqual('undefined');
      ctrl.updateAnalysesList();
      expect(typeof ctrl.timerList).toBeDefined();
      expect(mockAnalysesFlag).toEqual(true);
    });

    it('updateAnalysesRunningList is method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesRunningList)).toBe(true);
    });

    it('updateAnalysesRunningList sets timer and returns promise', function () {
      var mockAnalysesRunningFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesRunningFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerRunList).toEqual('undefined');
      ctrl.updateAnalysesRunningList();
      expect(typeof ctrl.timerRunList).toBeDefined();
      expect(mockAnalysesRunningFlag).toEqual(true);
    });
  });

  describe('Canceling Analyses', function () {
    var mockCancelFlag = false;

    beforeEach(inject(function () {
      spyOn(factory, 'postCancelAnalysis').and.callFake(function () {
        return {
          then: function () {
            mockCancelFlag = true;
          }
        };
      });

      ctrl.analysesDetail[fakeUuid] = {
        refineryImport: [{
          status: 'PROGRESS',
          percent_done: 30
        }],
        galaxyImport: [{
          status: '',
          percent_done: ''
        }],
        galaxyAnalysis: [{
          status: '',
          percent_done: ''
        }],
        galaxyExport: [{
          status: '',
          percent_done: ''
        }],
        overrall: 'RUNNING'
      };
    }));

    it('cancelAnalysis and setCancelAnalysisFlag are methods', function () {
      expect(angular.isFunction(ctrl.cancelAnalysis)).toBe(true);
      expect(angular.isFunction(ctrl.setCancelAnalysisFlag)).toBe(true);
    });

    it('cancelAnalysis, check postCancelAnalysis is called', function () {
      expect(mockCancelFlag).toEqual(false);
      ctrl.cancelAnalysis(fakeUuid);
      expect(mockCancelFlag).toEqual(true);
    });

    it('setCancelAnalysisFlag', function () {
      ctrl.setCancelAnalysisFlag(true, fakeInvalidUuid);
      expect(ctrl.initializedFlag[fakeInvalidUuid]).toEqual(true);

      ctrl.setCancelAnalysisFlag(false, fakeUuid);
      expect(ctrl.analysesDetail[fakeUuid].cancelingAnalyses).toEqual(false);

      ctrl.setCancelAnalysisFlag(true, fakeUuid);
      expect(ctrl.analysesDetail[fakeUuid].cancelingAnalyses).toEqual(true);
    });
  });

  describe('Helper functions', function () {
    beforeEach(inject(function ($timeout) {
      timeout = $timeout;

      ctrl.analysesDetail[fakeUuid] = {
        refineryImport: [{
          status: 'PROGRESS',
          percent_done: 30
        }],
        galaxyImport: [{
          status: '',
          percent_done: ''
        }],
        galaxyAnalysis: [{
          status: '',
          percent_done: ''
        }],
        galaxyExport: [{
          status: '',
          percent_done: ''
        }],
        overrall: 'RUNNING'
      };
    }));

    it('refreshAnalysesDetail method is function', function () {
      expect(angular.isFunction(ctrl.refreshAnalysesDetail)).toBe(true);
    });

    it('refreshAnalysesDetail method calls update Analyses Detail', function () {
      factory.analysesRunningList = [
        {
          uuid: 'xxx0'
        },
        {
          uuid: 'xxx1'
        },
        {
          uuid: 'xxx2'
        }
      ];
      spyOn(ctrl, 'updateAnalysesDetail').and.returnValue(true);
      ctrl.refreshAnalysesDetail();
      expect(ctrl.analysesRunningList).toEqual(factory.analysesRunningList);
      expect(ctrl.updateAnalysesDetail.calls.count())
        .toEqual(factory.analysesRunningList.length);
    });

    it('cancelTimerRunningList method is function', function () {
      expect(angular.isFunction(ctrl.cancelTimerRunningList)).toBe(true);
    });

    it('cancelTimerRunningList method cancel timerRunList', function () {
      ctrl.timerRunList = timeout(10);
      expect(typeof ctrl.timerRunList.$$state.value).toEqual('undefined');
      ctrl.cancelTimerRunningList();
      expect(ctrl.timerRunList.$$state.value).toEqual('canceled');
    });

    it('setAnalysesLoadingFlag method is function', function () {
      expect(angular.isFunction(ctrl.setAnalysesLoadingFlag)).toBe(true);
    });

    it('setAnalysesLoadingFlag responds correctly', function () {
      // Default of analysesList should be 0.
      ctrl.setAnalysesLoadingFlag();
      expect(ctrl.analysesLoadingFlag).toEqual('EMPTY');

      ctrl.analysesList = [{}, {}, {}];
      ctrl.setAnalysesLoadingFlag();
      expect(ctrl.analysesLoadingFlag).toEqual('DONE');
    });

    it('isAnalysesRunning method is function', function () {
      expect(angular.isFunction(ctrl.isAnalysesRunning)).toBe(true);
    });

    it('isAnalysesRunning responds correctly', function () {
      ctrl.analysesRunningList = undefined;
      var responseInvalid = ctrl.isAnalysesRunning();
      expect(responseInvalid).toEqual(false);

      ctrl.analysesRunningList = [{}, {}, {}];
      var responseValid = ctrl.isAnalysesRunning();
      expect(responseValid).toEqual(true);
    });

    it('updateAnalysesDetail method is function', function () {
      expect(angular.isFunction(ctrl.updateAnalysesDetail)).toBe(true);
    });

    it('isAnalysisDetailLoaded method is function', function () {
      expect(angular.isFunction(ctrl.isAnalysisDetailLoaded)).toBe(true);
    });

    it('isAnalysisDetailLoaded responds correctly', function () {
      var responseValid = ctrl.isAnalysisDetailLoaded(fakeUuid);
      expect(responseValid).toEqual(true);
      var responseInvalid = ctrl.isAnalysisDetailLoaded(fakeInvalidUuid);
      expect(responseInvalid).toEqual(false);
    });
  });
});
