describe('DataSet.search-api: unit tests', function () {
  'use strict';

  var $httpBackend,
      $rootScope,
      Factory,
      factoryInstance,
      limit = 1,
      offset = 0,
      query = 'test',
      settings,
      fakeQueryResponse = '' +
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

  var params = '?defType=edismax&f.description.hl.alternateField=description&' +
    'f.title.hl.alternateField=title&fl=dbid,uuid,access&' +
    'fq=django_ct:core.dataset&hl=true&hl.fl=title,description&' +
    'hl.maxAlternateFieldLength=128&hl.simple.post=%3C%2Fem%3E&' +
    'hl.simple.pre=%3Cem%3E&q=' + query + '&' +
    'qf=title%5E0.5+accession+submitter+text&rows=' + limit +
    '&start=' + offset +'&wt=json';

  beforeEach(function () {
    module('refineryApp');
    module('dataSet');

    inject(function ($injector) {
      $httpBackend = $injector.get('$httpBackend');
      $rootScope = $injector.get('$rootScope');
      settings = $injector.get('settings');
      Factory = $injector.get('DataSetSearchApi');

      factoryInstance = new Factory(query);

      $httpBackend
        .expectGET(
          settings.appRoot + settings.solrApi + '/core/select' + params
        )
        .respond(200, fakeQueryResponse);
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
        expect(typeof factoryInstance).toEqual('function');
      }
    );

    // Not working right now. `factoryInstance` doesn't return any data, not
    // even an empty skeleton object, which is weird.
    it('should resolve a promise',
      function () {
        var data = 'test',
            results,
            promise = factoryInstance(limit, offset);

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
