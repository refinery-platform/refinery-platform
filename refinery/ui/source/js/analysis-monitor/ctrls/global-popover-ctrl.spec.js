(function () {
  'use strict';

  describe('Controller: AnalysisMonitorGlobalPopoverCtrl', function () {
    var ctrl;
    var factory;
    var timeout;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryAnalysisMonitor'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      $timeout,
      analysisMonitorFactory
    ) {
      ctrl = $controller('AnalysisMonitorGlobalPopoverCtrl', {
        $scope: $rootScope.$new()
      });
      factory = analysisMonitorFactory;
      timeout = $timeout;
    }));

    afterEach(function () {
      timeout.cancel(ctrl.timerGlobalList);
      timeout.cancel(ctrl.timerRunGlobalList);
    });

    it('AnalysisMonitorGlobalPopoverCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.analysesRunningGlobalList).toEqual([]);
      expect(ctrl.analysesGlobalLoadingFlag).toEqual('LOADING');
      expect(ctrl.analysesGlobalDetail).toEqual({});
      expect(ctrl.analysesRunningGlobalList).toEqual([]);
    });

    it('cancelTimerGlobalList method is function', function () {
      expect(angular.isFunction(ctrl.cancelTimerGlobalList)).toBe(true);
    });

    it('cancelTimerGlobalList method cancel timerGlobalList', function () {
      ctrl.timerGlobalList = timeout(10);
      expect(typeof ctrl.timerGlobalList.$$state.value).toEqual('undefined');
      ctrl.cancelTimerGlobalList();
      expect(ctrl.timerGlobalList.$$state.value).toEqual('canceled');
    });

    it('refreshAnalysesGlobalDetail method is function', function () {
      expect(angular.isFunction(ctrl.refreshAnalysesGlobalDetail)).toBe(true);
    });

    it('refreshAnalysesGlobalDetail method calls update Analyses Detail', function () {
      factory.analysesRunningGlobalList = [
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
      spyOn(ctrl, 'updateAnalysesGlobalDetail').and.returnValue(true);
      ctrl.refreshAnalysesGlobalDetail();
      expect(ctrl.analysesRunningGlobalList).toEqual(factory.analysesRunningGlobalList);
      expect(ctrl.updateAnalysesGlobalDetail.calls.count())
        .toEqual(factory.analysesRunningGlobalList.length);
    });

    it('updateAnalysesGlobalDetail method is function', function () {
      expect(angular.isFunction(ctrl.updateAnalysesGlobalDetail)).toBe(true);
    });

    it('setAnalysesGlobalLoadingFlag method is function', function () {
      expect(angular.isFunction(ctrl.setAnalysesGlobalLoadingFlag)).toBe(true);
    });

    it('setAnalysesGlobalLoadingFlag responds correctly', function () {
      // Default of analysesList should be 0.
      ctrl.setAnalysesGlobalLoadingFlag();
      expect(ctrl.analysesGlobalLoadingFlag).toEqual('EMPTY');

      ctrl.analysesGlobalList = [{}, {}, {}];
      ctrl.setAnalysesGlobalLoadingFlag();
      expect(ctrl.analysesGlobalLoadingFlag).toEqual('DONE');
    });

    it('updateAnalysesGlobalList is  method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesGlobalList)).toBe(true);
    });

    it('updateAnalysesGlobalList sets timer and returns promise', function () {
      var mockAnalysesGlobalFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesGlobalFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerGlobalList).toEqual('undefined');
      ctrl.updateAnalysesGlobalList();
      expect(typeof ctrl.timerGlobalList).toBeDefined();
      expect(mockAnalysesGlobalFlag).toEqual(true);
    });
  });
})();
