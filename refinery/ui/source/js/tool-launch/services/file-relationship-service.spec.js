(function () {
  'use strict';

  describe('File Relationship Service', function () {
    var mocker;
    var service;
    var toolsFactory;
    var mockWorkflow;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      fileRelationshipService,
      mockParamsFactory,
      toolsService
    ) {
      service = fileRelationshipService;
      mocker = mockParamsFactory;
      toolsFactory = toolsService;

      mockWorkflow = {
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
                      uuid: mocker.generateUuid(),
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
                      uuid: '233986c5-d4f2-4d04-9be5-323eddcc85ba',
                      name: 'Cool Input File B',
                      description: 'Cool Input File B Description'
                    }
                  ],
                  uuid: 'c6af0093-52fa-48b9-92fc-3b41b382a43f',
                  name: 'Pair of input files',
                  value_type: 'PAIR'
                }
              ],
              input_files: [],
              uuid: '283a97a6-a676-40ce-b6d9-5f5aa5cea28f',
              name: 'List of Pairs',
              value_type: 'LIST'
            }
          ],
          input_files: [],
          uuid: 'd8342a83-60fa-4619-a924-06e5a0711232',
          name: 'List of Lists',
          value_type: 'LIST'
        },
        output_files: [
          {
            filetype: {
              name: 'BIGWIG',
              description: 'Big WIG',
              used_for_visualization: true
            },
            uuid: '566b9d6c-0b90-4dcc-8444-3013eb1ec05e',
            name: 'output_file',
            description: 'cool'
          }
        ],
        parameters: [],
        uuid: 'e655ecec-4833-434d-9244-d5d53445cf8e',
        name: 'Test workflow: LIST:LIST:PAIR',
        description: 'Test LIST:LIST:PAIR description',
        tool_type: 'WORKFLOW',
        docker_image_name: '',
        container_input_path: null,
        galaxy_workflow_id: null,
        workflow_engine: null
      };
    }));

    it('service should exist', function () {
      expect(service).toBeDefined();
    });

    it('view model variables should exist', function () {
      expect(service.attributesObj).toEqual({});
      expect(service.currentGroup).toEqual([]);
      expect(service.currentTypes).toEqual([]);
      expect(service.groupCollection).toEqual({});
      expect(service.hideNodePopover).toEqual(false);
      expect(service.inputFileTypes).toEqual([]);
      expect(service.nodeSelectCollection).toEqual({});
    });

    describe('refreshFileMap', function () {
      beforeEach(function () {
        angular.copy(mockWorkflow, toolsFactory.selectedTool);
      });

      it('refreshFileMap is a method', function () {
        expect(angular.isFunction(service.refreshFileMap)).toBe(true);
      });

      it('passes when file_relationship is empty', function () {
        angular.copy({}, toolsFactory.selectedTool);
        service.refreshFileMap();
        expect(service.currentGroup).toEqual([]);
        expect(service.currentTypes).toEqual([]);
      });

      it('generates correct currentTypes', function () {
        service.refreshFileMap();
        expect(service.currentTypes).toEqual(['LIST', 'LIST', 'PAIR']);
      });

      it('generates correct currentGroups', function () {
        service.refreshFileMap();
        expect(service.currentGroup).toEqual([0, 0, 0]);
      });
    });

    describe('resetMethods', function () {
      it('resetToolRelated is a method', function () {
        expect(angular.isFunction(service.resetToolRelated)).toBe(true);
      });

      it('resetToolRelated resets variables', function () {
        service.currentGroup = [0, 0, 1];
        service.currentTypes = ['PAIR', 'LIST', 'LIST'];
        service.inputFileTypes = [
          {
            name: 'Input File Mock Name',
            uuid: mocker.generateUuid(),
            description: 'Big WIG',
            allowed_filetypes: [{ name: 'BAM' }]
          }
        ];
        service.resetToolRelated();
        expect(service.currentGroup).toEqual([]);
        expect(service.currentTypes).toEqual([]);
        expect(service.inputFileTypes).toEqual([]);
      });
    });

    describe('setNodeSelectCollection', function () {
      it('setNodeSelectCollection is a method', function () {
        expect(angular.isFunction(service.setNodeSelectCollection)).toBe(true);
      });
    });

    describe('Set Group Collection', function () {
      it('setGroupCollection is a method', function () {
        expect(angular.isFunction(service.setGroupCollection)).toBe(true);
      });
    });
  });
})();
