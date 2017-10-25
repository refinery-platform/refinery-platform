(function () {
  'use strict';

  describe('Common.service.toolDefinitions: unit tests', function () {
    var $httpBackend;
    var $rootScope;
    var service;
    var fakeResponse = [
      {
        file_relationship: {
          file_relationship: [
            {
              file_relationship: [
                {
                  file_relationship: [],
                  input_files: [
                    {
                      allowed_filetypes: [
                        {
                          name: 'BAM',
                          description: 'Binary compressed SAM',
                          used_for_visualization: true
                        },
                        {
                          name: 'FASTQ',
                          description: 'FASTQ file',
                          used_for_visualization: false
                        }
                      ],
                      uuid: 'f052e5f1-2ae9-4acc-92aa-e8ef67dec86b',
                      name: 'Cool Input File A',
                      description: 'Cool Input File A Description'
                    },
                    {
                      allowed_filetypes: [
                        {
                          name: 'BAM',
                          description: 'Binary compressed SAM',
                          used_for_visualization: true
                        },
                        {
                          name: 'FASTQ',
                          description: 'FASTQ file',
                          used_for_visualization: false
                        }
                      ],
                      uuid: '330c720a-fcd6-4f35-8f6a-4e431b43eaf6',
                      name: 'Cool Input File B',
                      description: 'Cool Input File B Description'
                    }
                  ],
                  uuid: '60673af4-888b-4f00-93d5-e74ea6ebcb2d',
                  name: 'Pair of input files',
                  value_type: 'PAIR'
                }
              ],
              input_files: [],
              uuid: 'f9369aed-c925-46ea-b518-64510783f487',
              name: 'List of Pairs',
              value_type: 'LIST'
            }
          ],
          input_files: [],
          uuid: 'e97097a1-71a2-4826-97d5-ec3159af968c',
          name: 'List of Lists',
          value_type: 'LIST'
        },
        parameters: [],
        uuid: 'a55a238d-df29-4990-a7ef-1d18142192d2',
        name: 'Test workflow: LIST:LIST:PAIR',
        description: 'Test LIST:LIST:PAIR description',
        tool_type: 'WORKFLOW'
      },
      {
        file_relationship: {
          file_relationship: [],
          input_files: [
            {
              allowed_filetypes: [
                {
                  name: 'FASTQ',
                  description: 'FASTQ file',
                  used_for_visualization: false
                }
              ],
              uuid: 'de633637-9bcf-4d90-ae59-f546f1091a21',
              name: 'Cool Input File',
              description: 'Cool Input File Description'
            }
          ],
          uuid: '1de2550f-3a82-45c6-b660-e6bade536a15',
          name: 'Flat list of N Samples',
          value_type: 'LIST'
        },
        parameters: [],
        uuid: 'ac81f921-bcc8-47ea-898a-043aa26ce076',
        name: 'Test Workflow: LISTS',
        description: 'Test LIST description',
        tool_type: 'WORKFLOW'
      }
    ];

    beforeEach(function () {
      module('refineryApp');

      inject(function ($injector) {
        var settings = $injector.get('settings');
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = $injector.get('$rootScope');
        service = $injector.get('toolDefinitionsService');

        $httpBackend
          .expectGET(
            settings.appRoot +
            settings.refineryApiV2 +
            '/tool_definitions/?dataSetUuid='
        ).respond(200, fakeResponse);
      });
    });

    describe('Service', function () {
      it('should be defined', function () {
        expect(service).toBeDefined();
      });

      it('should be a method', function () {
        expect(typeof service).toEqual('function');
      });

      it('should return a resolving promise', function () {
        var results;
        var promise = service.query()
          .$promise.then(function (response) {
            results = response;
          });

        expect(typeof promise.then).toEqual('function');
        $httpBackend.flush();
        $rootScope.$digest();
        expect(results.length)
          .toEqual(fakeResponse.length);
        expect(results[0].uuid).toEqual(fakeResponse[0].uuid);
        expect(results[1].uuid).toEqual(fakeResponse[1].uuid);
      });
    });
  });
})();
