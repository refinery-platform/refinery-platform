describe('Filter: AnalysisMonitorRunningStatusPercent', function () {

  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisMonitorRunningStatusPercent');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  var emptyParam = {};
  var startedParam = {
    'refineryImport': {'state': 'RUNNING', 'percentDone': 50},
    'galaxyImport':   {'state': 'PENDING'},
    'galaxyAnalysis': {'state': 'PENDING'},
    'galaxyExport':   {'state': 'PENDING'}
  };
  var partialParam1 = {
    'refineryImport': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyImport':   {'state': 'RUNNING', 'percentDone': 25},
    'galaxyAnalysis': {'state': 'PENDING'},
    'galaxyExport':   {'state': 'PENDING'}
  };
  var partialParam2 = {
    'refineryImport': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyImport':   {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyAnalysis': {'state': 'RUNNING', 'percentDone': 35},
    'galaxyExport':   {'state': 'PENDING'}
  };
  var partialParam3 = {
    'refineryImport': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyImport':   {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyAnalysis': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyExport':   {'state': 'RUNNING', 'percentDone': 78}
  };
  var completedParam = {
    'refineryImport': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyImport':   {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyAnalysis': {'state': 'SUCCESS', 'percentDone': 100},
    'galaxyExport':   {'state': 'SUCCESS', 'percentDone': 100}
  };

  it('should return percentDone depending on completed state', function () {
      expect(filter(emptyParam))
        .toBe('...');
      expect(filter(startedParam))
        .toBe(50);
      expect(filter(partialParam1))
        .toBe(25);
      expect(filter(partialParam2))
        .toBe(35);
      expect(filter(partialParam3))
        .toBe(78);
      expect(filter(completedParam))
        .toBe(0);
  });
});
