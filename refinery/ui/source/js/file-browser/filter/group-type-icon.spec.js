(function () {
  'use strict';
  describe('Filter: Group-Type-Icon', function () {
    var filter;

    beforeEach(function () {
      module('refineryApp');
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
