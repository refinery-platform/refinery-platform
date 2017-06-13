(function () {
  'use strict';
  describe('Filter: AnalysisStatusIcon', function () {
    var filter;

    beforeEach(function () {
      module('refineryFileBrowser');

      inject(function ($filter) {
        filter = $filter('groupTypeIcon');
      });
    });

    it('filter should exist', function () {
      expect(filter).toBeDefined();
    });

    it('should return correct status depending on LIST', function () {
      expect(filter('LIST')).toEqual('fa fa-list');
    });

    it('should return correct status depending on PAIR', function () {
      expect(filter('PAIR')).toEqual('fa fa-link');
    });
  });
})();
