(function () {
  'use strict';

  describe('Controller: AnalysisMonitorGlobalStatusCtrl', function () {
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
      ctrl = $controller('AnalysisMonitorGlobalStatusCtrl', {
        $scope: $rootScope.$new()
      });
    }));

    it('AnalysisMonitorGlobalStatusCtrl should exist', function () {
      expect(ctrl).toBeDefined();
    });

    it('Data & UI displays variables should exist for views', function () {
      expect(ctrl.analysesRunningGlobalCount).toEqual(0);
    });

    it('updateAnalysesRunningGlobalCount is method', function () {
      expect(angular.isFunction(ctrl.updateAnalysesRunningGlobalCount)).toBe(true);
    });

    it('updateAnalysesRunningGlobalCount sets timer and returns promise', function () {
      var mockAnalysesRunningGlobalFlag = false;
      spyOn(factory, 'getAnalysesList').and.callFake(function () {
        return {
          then: function () {
            mockAnalysesRunningGlobalFlag = true;
          }
        };
      });

      expect(typeof ctrl.timerRunGlobal).toEqual('undefined');
      ctrl.updateAnalysesRunningGlobalCount();
      expect(typeof ctrl.timerRunGlobal).toBeDefined();
      expect(mockAnalysesRunningGlobalFlag).toEqual(true);
    });
  });
})();
