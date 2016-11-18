'use strict';

describe('IGV Factory', function () {
  // 'use strict';
  var factory;

  beforeEach(module('refineryApp'));
  beforeEach(module('refineryIGV'));
  beforeEach(inject(function (_IGVFactory_) {
    factory = _IGVFactory_;
  }));

  it('factory and tools variables should exist', function () {
    expect(factory).toBeDefined();
    expect(factory.speciesList).toEqual([]);
  });

  describe('getSpeciesList', function () {
    var $httpBackend;

    beforeEach(inject(function (_$httpBackend_) {
      $httpBackend = _$httpBackend_;
    }));

    it('getSpeciesList is a method', function () {
      expect(angular.isFunction(factory.getSpeciesList)).toBe(true);
    });

    it('getSpeciesList makes success call', function () {
      var igvConfig = {
        node_selection: ['x508x83x-x9xx-4740-x9x7-x7x0x631280x'],
        node_selection_blacklist_mode: false
      };

      $httpBackend.expectPOST('/solr/igv/',
        igvConfig,
        {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json,' +
            ' text/plain, */*',
          'Content-Type': 'application/json;' +
            'charset=utf-8'
        }
      ).respond(200, {}, {});
      var data;
      var response = factory.getSpeciesList(igvConfig).then(function () {
        data = 'success';
      }, function () {
        data = 'error';
      });
      $httpBackend.flush();
      expect(typeof response.then).toEqual('function');
      expect(data).toEqual('success');
    });
  });
});
