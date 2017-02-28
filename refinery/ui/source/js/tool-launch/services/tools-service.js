(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('toolsService', [toolsService]);

  function toolsService () {
    var selectedTool = {};
    var toolList = [
      {
        file_relationship: {
          nested_elements: [
            {
              nested_elements: [],
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
                  uuid: 'ccfd9be4-bbe6-4147-b51f-37c6a70d9a1f',
                  name: 'ChIP file',
                  description: 'File with actual signal'
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
                  uuid: '302fc966-c263-4037-890e-515918278bff',
                  name: 'Input file',
                  description: 'File with background signal'
                }
              ],
              uuid: '9126390d-8934-4451-ab2e-bdf5509ec5df',
              name: 'ChIP vs Input Pair',
              value_type: 'PAIR'
            }
          ],
          input_files: [],
          uuid: '2038c28e-75b1-4fd8-9929-8adbc0d223cd',
          name: 'List of Paired Samples',
          value_type: 'LIST'
        },
        output_files: [
          {
            filetype: {
              name: 'BED',
              description: 'BED file',
              used_for_visualization: true
            },
            uuid: '6598965c-af34-439c-9f71-0d4f26c62062',
            name: 'broadpeaks.bed',
            description: 'Peaks called by MACS2'
          }
        ],
        parameters: [
          {
            uuid: 'be362958-e8d3-4966-bd2d-92a8361d4fef',
            name: 'Genome Build',
            description: 'The genome build to use for this workflow. Has' +
              ' to be installed in Galaxy workflow engine.',
            is_editable: false,
            value_type: 'GENOME_BUILD',
            default_value: 'hg19',
            galaxy_tool_id: 'CHIP SEQ XXX',
            galaxy_tool_parameter: 'genome_build'
          }
        ],
        uuid: '333c1543-084a-420c-84a8-bd8b2bf6ef27',
        name: 'Chip Seq <list:pair>',
        description: 'Chip Seq using MACS2',
        tool_type: 'Workflow'
      },
      {
        file_relationship: {
          nested_elements: [
            {
              nested_elements: [
                {
                  nested_elements: [],
                  input_files: [
                    {
                      allowed_filetypes: [
                        {
                          name: 'FASTQ',
                          description: 'FASTQ file',
                          used_for_visualization: false
                        }
                      ],
                      uuid: 'ac9a9bdd-9ce7-4935-90b3-75eef1f2f6b5',
                      name: 'Input B',
                      description: 'Input B desc'
                    },
                    {
                      allowed_filetypes: [
                        {
                          name: 'FASTQ',
                          description: 'FASTQ file',
                          used_for_visualization: false
                        }
                      ],
                      uuid: '2e9777fb-b88f-4bc8-a08d-cfd9eb8fac0f',
                      name: 'Input A',
                      description: 'Input A desc'
                    }
                  ],
                  uuid: 'f7be390c-ff76-4185-ac0a-a135fd4fe766',
                  name: 'Generic Pair',
                  value_type: 'PAIR'
                }
              ],
              input_files: [],
              uuid: 'c0c2ec1b-2585-4f21-b3bc-18e2a7ed2045',
              name: 'List of Paired Samples',
              value_type: 'LIST'
            }
          ],
          input_files: [],
          uuid: '63f65863-bce1-4480-ac57-8fbe2283aada',
          name: 'List of Lists',
          value_type: 'LIST'
        },
        output_files: [
          {
            filetype: {
              name: 'BED',
              description: 'BED file',
              used_for_visualization: true
            },
            uuid: '5e47309f-122f-4813-a8ea-e29401b64cc5',
            name: 'generic.bed',
            description: 'Generic output desc'
          }
        ],
        parameters: [
          {
            uuid: '8d22669a-d2b4-4397-a929-8077bd2e5dc3',
            name: 'Generic Param',
            description: 'Generic Param Desc',
            is_editable: false,
            value_type: 'BOOLEAN',
            default_value: 'True',
            galaxy_tool_id: 'Generic XXX',
            galaxy_tool_parameter: 'generic_param'
          }
        ],
        uuid: '4b87a199-362f-4e60-a14f-12f9661d55c7',
        name: 'Sample <list:list:pair> Tool',
        description: '<list:list:pair> desc',
        tool_type: 'Workflow'
      }
    ];

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function setSelectedTool (tool) {
      angular.copy(tool, selectedTool);
    }


    /* Return */
    return {
      selectedTool: selectedTool,
      setSelectedTool: setSelectedTool,
      toolList: toolList
    };
  }
})();
