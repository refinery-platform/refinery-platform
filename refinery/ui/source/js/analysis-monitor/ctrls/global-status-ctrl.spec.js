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
      expect(ctrl.analysesRunningGlobalListCount).toEqual(0);
    });

    it('updateAnalysesRunningGlobalListCount is method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesRunningGlobalListCount)).toBe(true);
    });

    it('updateAnalysesRunningGlobalListCount sets timer and returns promise', function () {
      var mockAnalysesRunningGlobalFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesRunningGlobalFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerRunGlobalList).toEqual('undefined');
      ctrl.updateAnalysesRunningGlobalListCount();
      expect(typeof ctrl.timerRunGlobalList).toBeDefined();
      expect(mockAnalysesRunningGlobalFlag).toEqual(true);
    });
  });
})();
