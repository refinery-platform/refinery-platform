describe('Filter: AnalysisStatusIcon', function () {

  var filter;

  beforeEach(function () {
    module('refineryApp');

    inject(function ($filter) {
      filter = $filter('analysisStatusIcon');
    });
  });

  it('filter should exist', function () {
    expect(filter).toBeDefined();
  });

  it('should return correct status depending on state', function () {
      expect(filter('SUCCESS')).toBe('icon-ok-sign');
      expect(filter('FAILURE')).toBe('icon-warning-sign');
      expect(filter('RUNNING')).toBe('icon-cog');
      expect(filter('INITIALIZED')).toBe('icon-cog');
      expect(filter('UNKNOWN')).toBe('icon-question-sign');
      expect(filter('')).toBe('icon-question-sign');
  });
});
