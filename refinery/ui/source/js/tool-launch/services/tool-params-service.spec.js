(function () {
  'use strict';

  describe('Tools Params Service', function () {
    var mocker;
    var service;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (mockParamsFactory, toolParamsService) {
      mocker = mockParamsFactory;
      service = toolParamsService;
    }));

    it('service and variables should exist', function () {
      expect(service).toBeDefined();
      expect(service.paramsForm).toEqual({});
      expect(service.toolParams).toEqual([]);
    });

    it('setSelectedTool is a method', function () {
      expect(angular.isFunction(service.refreshToolParams)).toBe(true);
    });

    it('refreshToolParams sets tools param', function () {
      var tool = {
        file_relationship: {
          file_relationship: [],
          input_files: [],
          uuid: mocker.generateUuid(),
          name: 'List of FASTQ Files',
          value_type: 'LIST'
        },
        parameters: [
          {
            galaxy_workflow_step: 1,
            uuid: mocker.generateUuid(),
            name: 'exit_code',
            description: 'Integer Param description',
            is_user_adjustable: true,
            value_type: 'INTEGER',
            default_value: '1337'
          }
        ],
        uuid: mocker.generateUuid(),
        name: 'FASTQC Quality Control',
        description: 'Runs FASTQC quality control on a set of FASTQ files.',
        tool_type: 'WORKFLOW',
        image_name: '',
        galaxy_workflow_id: 'c0279aab05812500',
        workflow_engine: 1
      };
      service.refreshToolParams(tool);
      expect(service.toolParams[0].uuid).toBe(tool.parameters[0].uuid);
    });
  });
})();
