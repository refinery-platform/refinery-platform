describe('Filter: AnalysisStatusTitle', function () {

  var filter;
  var statusObj = {
    'SUCCESS': 'Analysis successful.',
    'FAILURE': 'Analysis failed.',
    'RUNNING': 'Analysis is running.',
    'INITIALIZED': 'Analysis is initializing.',
    'UNKNOWN': 'Analysis status unknown.'
  };

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisStatusTitle');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct status depending on state', function () {
    for ( var status in statusObj ){
      expect(filter(status)).toBe(statusObj[status]);
    }
    expect(filter('')).toBe('Analysis status unknown.');
  });
});
