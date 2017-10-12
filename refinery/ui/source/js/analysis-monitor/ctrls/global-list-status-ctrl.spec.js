(function () {
  'use strict';

  describe('Controller: AnalysisMonitorGlobalListStatusCtrl', function () {
    var ctrl;
    var factory;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryAnalysisMonitor'));
    beforeEach(inject(function (
      $controller,
      $rootScope,
      analysisMonitorFactory
    ) {
      factory = analysisMonitorFactory;
      ctrl = $controller('AnalysisMonitorGlobalListStatusCtrl', {
        $scope: $rootScope.$new()
      });
    }));

    it('AnalysisMonitorGlobalListStatusCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.analysesRunningGlobalList).toEqual([]);
      expect(ctrl.analysesRunningGlobalListCount).toEqual(0);
      expect(ctrl.launchAnalysisFlag).toEqual(false);
    });

    it('updateAnalysesRunningGlobalList is method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesRunningGlobalList)).toBe(true);
    });

    it('updateAnalysesRunningGlobalList sets timer and returns promise', function () {
      var mockAnalysesRunningGlobalFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesRunningGlobalFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerRunGlobalList).toEqual('undefined');
      ctrl.updateAnalysesRunningGlobalList();
      expect(typeof ctrl.timerRunGlobalList).toBeDefined();
      expect(mockAnalysesRunningGlobalFlag).toEqual(true);
    });
  });
})();
