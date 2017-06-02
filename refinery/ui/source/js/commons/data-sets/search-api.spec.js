'use strict';

describe('DataSet.search-api: unit tests', function () {
  var $httpBackend;
  var $rootScope;
  var Factory;
  var factoryInstance;
  var limit = 1;
  var offset = 0;
  var query = 'test';
  var settings;
  var fakeQueryResponse = '' +
    '{' +
    '  "responseHeader": {' +
    '    "status": 0,' +
    '    "QTime": 139,' +
    '    "params": {' +
    '      "f.description.hl.alternateField": "description",' +
    '      "fl": "id,uuid,access",' +
    '      "start": "0",' +
    '      "f.content_auto.hl.alternateField": "title",' +
    '      "hl.maxAlternateFieldLength": "128",' +
    '      "q": "zebra",' +
    '      "qf": "content_auto^0.5 submitter text",' +
    '      "hl.simple.pre": "<em>",' +
    '      "hl.simple.post": "</em>",' +
    '      "hl.fl": "content_auto,description",' +
    '      "wt": "json",' +
    '      "hl": "true",' +
    '      "fq": "django_ct:core.dataset",' +
    '      "rows": "50",' +
    '      "defType": "edismax"' +
    '    }' +
    '  },' +
    '  "response": {' +
    '    "numFound": 1,' +
    '    "start": 0,' +
    '    "docs": [' +
    '      {' +
    '        "access": [' +
    '          "u_3"' +
    '        ],' +
    '        "uuid": "3f27bef3-028b-4c6a-b483-d55935ee908a",' +
    '        "dbid": "205"' +
    '      }' +
    '    ]' +
    '  },' +
    '  "highlighting": {' +
    '    "core.dataset.205": {' +
    '      "title": [' +
    '        "lmo2 <em>zebra</em>fish"' +
    '      ]' +
    '    }' +
    '  }' +
    '}';

  function params (_query, _limit, _offset, _allIds, _synonyms) {
    var parameters = {
      allIds: _allIds,
      defType: _synonyms ? 'synonym_edismax' : 'edismax',
      'f.description.hl.alternateField': 'description',
      'f.title.hl.alternateField': 'title',
      'f.title.hl.fragsize': '0',
      fl: 'dbid,uuid,access',
      fq: 'django_ct:core.dataset',
      hl: 'true',
      'hl.fl': 'title,description',
      'hl.maxAlternateFieldLength': '128',
      'hl.simple.post': '%3C%2Fem%3E',
      'hl.simple.pre': '%3Cem%3E',
      q: _query,
      qf: 'title%5E0.5+accession+submitter+text+description',
      rows: _limit,
      start: _offset,
      synonyms: '' + !!_synonyms + '',
      wt: 'json'
    };
    var url = '';
    var paramNames = Object.keys(parameters);
    for (var i = 0, len = paramNames.length; i < len; i++) {
      url += '&' + paramNames[i] + '=' + parameters[paramNames[i]];
    }
    return '?' + url.substr(1);
  }

  beforeEach(function () {
    module('refineryApp');
    module('dataSet');

    inject(function ($injector) {
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      settings = $injector.get('settings');
      Factory = $injector.get('DataSetSearchApi');
    });
  });

  describe('Factory', function () {
    it('should be available',
      function () {
        expect(!!Factory).toEqual(true);
      }
    );
  });

  describe('Factory instance', function () {
    it('should be a function',
      function () {
        factoryInstance = new Factory(query);
        expect(typeof factoryInstance).toEqual('function');
      }
    );

    it('should resolve a promise',
      function () {
        factoryInstance = new Factory(query);

        var results;
        var promise = factoryInstance(limit, offset);

        $httpBackend
          .expectGET(
            settings.appRoot + settings.solrApi + '/core/select/' + params(
              query,
              limit,
              offset,
              0
            )
          )
          .respond(200, fakeQueryResponse);

        $httpBackend.flush();

        promise.then(function (data) {
          results = data;
        });

        $rootScope.$digest();

        expect(results.meta.total).toEqual(1);
      }
    );

    it('should alter `allIds` parameter',
      function () {
        factoryInstance = new Factory(query, true);

        var results;
        var promise = factoryInstance(limit, offset);

        $httpBackend
          .expectGET(
            settings.appRoot + settings.solrApi + '/core/select/' + params(
              query,
              limit,
              offset,
              1
            )
          )
          .respond(200, fakeQueryResponse);

        $httpBackend.flush();

        promise = factoryInstance(limit, offset);

        $httpBackend
          .expectGET(
            settings.appRoot + settings.solrApi + '/core/select/' + params(
              query,
              limit,
              offset,
              0
            )
          )
          .respond(200, fakeQueryResponse);

        $httpBackend.flush();

        promise.then(function (data) {
          results = data;
        });

        $rootScope.$digest();

        expect(results.meta.total).toEqual(1);
      }
    );

    it('should use different `defType` when synonym search is turned on',
      function () {
        settings.djangoApp.solrSynonymSearch = true;
        factoryInstance = new Factory(query, true);

        var results;
        var promise = factoryInstance(limit, offset);

        $httpBackend
          .expectGET(
            settings.appRoot + settings.solrApi + '/core/select/' + params(
              query,
              limit,
              offset,
              1,
              true
            )
          )
          .respond(200, fakeQueryResponse);

        $httpBackend.flush();

        promise.then(function (data) {
          results = data;
        });

        $rootScope.$digest();

        expect(results.meta.total).toEqual(1);
      }
    );
  });
});
