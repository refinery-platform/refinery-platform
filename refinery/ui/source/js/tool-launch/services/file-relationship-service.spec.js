(function () {
  'use strict';

  describe('File Relationship Service', function () {
    var mocker;
    var service;
    var toolsFactory;
    var mockWorkflow;
    var nodeService;
    var underscroll;

    beforeEach(module('refineryApp'));
    beforeEach(module('refineryToolLaunch'));
    beforeEach(inject(function (
      _,
      fileRelationshipService,
      mockParamsFactory,
      activeNodeService,
      toolSelectService
    ) {
      service = fileRelationshipService;
      mocker = mockParamsFactory;
      nodeService = activeNodeService;
      toolsFactory = toolSelectService;
      underscroll = _;

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
                      uuid: mocker.generateUuid(),
                      name: 'Cool Input File B',
                      description: 'Cool Input File B Description'
                    }
                  ],
                  uuid: mocker.generateUuid(),
                  name: 'Pair of input files',
                  value_type: 'PAIR'
                }
              ],
              input_files: [],
              uuid: mocker.generateUuid(),
              name: 'List of Pairs',
              value_type: 'LIST'
            }
          ],
          input_files: [],
          uuid: mocker.generateUuid(),
          name: 'List of Lists',
          value_type: 'LIST'
        },
        parameters: [],
        uuid: mocker.generateUuid(),
        name: 'Test workflow: LIST:LIST:PAIR',
        description: 'Test LIST:LIST:PAIR description',
        tool_type: 'WORKFLOW',
        docker_image_name: '',
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
      expect(service.inputFileTypeColor).toEqual({});
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
        expect(service.currentGroup).toEqual([0, 0]);
      });
    });

    describe('removeGroupFromCollections', function () {
      var currentGroupMock = [0, 1];
      var groupCollectionMock = {};
      groupCollectionMock[currentGroupMock] = {};
      var nodeSelectCollectionMock = {};
      var nodeUuid1;

      beforeEach(function () {
        var inputType1 = mocker.generateUuid();
        nodeUuid1 = mocker.generateUuid();
        var inputType2 = mocker.generateUuid();

        groupCollectionMock[[0, 0]] = {};
        groupCollectionMock[[0, 0]][inputType1] = [{ uuid: nodeUuid1 }];
        groupCollectionMock[currentGroupMock][inputType2] = [{ uuid: nodeUuid1 }];
        nodeSelectCollectionMock[nodeUuid1] = {
          inputTypeList: [inputType1, inputType2],
          groupList: [[0, 0], currentGroupMock]
        };
        angular.copy(currentGroupMock, service.currentGroup);
        angular.copy(groupCollectionMock, service.groupCollection);
        angular.copy(nodeSelectCollectionMock, service.nodeSelectCollection);
      });

      it('removeGroupFromCollections is a method', function () {
        expect(angular.isFunction(service.removeGroupFromCollections)).toBe(true);
      });

      it('removes a group', function () {
        expect(service.groupCollection).toEqual(groupCollectionMock);
        service.removeGroupFromCollections();
        expect(underscroll.has(service.groupCollection, currentGroupMock)).toBe(false);
      });

      it('updates node select collection', function () {
        expect(service.nodeSelectCollection).toEqual(nodeSelectCollectionMock);
        service.removeGroupFromCollections();
        expect(service.nodeSelectCollection[nodeUuid1].groupList.length).toEqual(1);
      });
    });

    describe('resetInputGroup', function () {
      var currentGroupMock = [0, 1];
      var groupCollectionMock = {};
      groupCollectionMock[currentGroupMock] = {};
      var nodeSelectCollectionMock = {};

      beforeEach(function () {
        var inputType1 = mocker.generateUuid();
        var nodeUuid1 = mocker.generateUuid();
        groupCollectionMock[currentGroupMock][inputType1] = [{ uuid: nodeUuid1 }];
        nodeSelectCollectionMock[nodeUuid1] = {
          inputTypeList: [inputType1],
          groupList: [currentGroupMock]
        };
        angular.copy(currentGroupMock, service.currentGroup);
        angular.copy(groupCollectionMock, service.groupCollection);
        angular.copy(nodeSelectCollectionMock, service.nodeSelectCollection);
      });

      it('resetInputGroup is a method', function () {
        expect(angular.isFunction(service.resetInputGroup)).toBe(true);
      });

      it('it resets currentGroupMock', function () {
        expect(service.currentGroup).toEqual(currentGroupMock);
        service.resetInputGroup();
        expect(service.currentGroup).toEqual([0, 0]);
      });

      it('resetToolRelated resets groupCollectionMock', function () {
        expect(service.groupCollection).toEqual(groupCollectionMock);
        service.resetInputGroup();
        expect(service.groupCollection).toEqual({});
      });

      it('resetToolRelated resets nodeSelectCollectionMock', function () {
        expect(service.nodeSelectCollection).toEqual(nodeSelectCollectionMock);
        service.resetInputGroup();
        expect(service.nodeSelectCollection).toEqual({});
      });
    });

    describe('resetToolRelated', function () {
      var currentGroupMock = [0, 0];
      var currentTypeMock = ['PAIR', 'LIST', 'LIST'];
      var groupCollectionMock = {};
      groupCollectionMock[currentGroupMock] = {};
      var inputFileTypesMock = [];
      var nodeSelectCollectionMock = {};

      beforeEach(function () {
        var inputType1 = mocker.generateUuid();
        var nodeUuid1 = mocker.generateUuid();
        groupCollectionMock[currentGroupMock][inputType1] = [{ uuid: nodeUuid1 }];
        inputFileTypesMock[0] = {
          name: 'Input File Mock Name',
          uuid: mocker.generateUuid(),
          description: 'Big WIG',
          allowed_filetypes: [{ name: 'BAM' }]
        };
        nodeSelectCollectionMock[nodeUuid1] = {
          inputTypeList: [inputType1],
          groupList: [currentGroupMock]
        };
        angular.copy(currentGroupMock, service.currentGroup);
        angular.copy(currentTypeMock, service.currentTypes);
        angular.copy(inputFileTypesMock, service.inputFileTypes);
        angular.copy(groupCollectionMock, service.groupCollection);
        angular.copy(nodeSelectCollectionMock, service.nodeSelectCollection);
        service.hideNodePopover = true;
      });

      it('resetToolRelated is a method', function () {
        expect(angular.isFunction(service.resetToolRelated)).toBe(true);
      });

      it('resetToolRelated resets currentGroupMock', function () {
        expect(service.currentGroup).toEqual(currentGroupMock);
        service.resetToolRelated();
        expect(service.currentGroup).toEqual([]);
      });

      it('resetToolRelated resets currentTypeMock', function () {
        expect(service.currentTypes).toEqual(currentTypeMock);
        service.resetToolRelated();
        expect(service.currentTypes).toEqual([]);
      });

      it('resetToolRelated resets inputFileTYpes', function () {
        expect(service.inputFileTypes).toEqual(inputFileTypesMock);
        service.resetToolRelated();
        expect(service.inputFileTypes).toEqual([]);
      });

      it('resetToolRelated resets groupCollectionMock', function () {
        expect(service.groupCollection).toEqual(groupCollectionMock);
        service.resetToolRelated();
        expect(service.groupCollection).toEqual({});
      });

      it('resetToolRelated resets nodeSelectCollectionMock', function () {
        expect(service.nodeSelectCollection).toEqual(nodeSelectCollectionMock);
        service.resetToolRelated();
        expect(service.nodeSelectCollection).toEqual({});
      });

      it('resets hideNodePopover', function () {
        expect(service.hideNodePopover).toEqual(true);
        service.resetToolRelated();
        expect(service.hideNodePopover).toEqual(false);
      });
    });

    describe('Set Group Collection', function () {
      var currentGroupMock = [0, 0];
      var inputTypeUuid1;
      var inputTypeUuid2;
      var nodeUuid1;
      var nodeUuid2;
      var selectionObj = {};

      beforeEach(function () {
        inputTypeUuid1 = mocker.generateUuid();
        inputTypeUuid2 = mocker.generateUuid();
        nodeUuid1 = mocker.generateUuid();
        nodeUuid2 = mocker.generateUuid();
        selectionObj[currentGroupMock] = {};
        selectionObj[currentGroupMock][inputTypeUuid1] = {};
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid1] = true;
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid2] = true;
        selectionObj[currentGroupMock][inputTypeUuid2] = {};
        selectionObj[currentGroupMock][inputTypeUuid2][nodeUuid2] = true;

        angular.copy({ uuid: nodeUuid1 }, nodeService.activeNodeRow);
        angular.copy(currentGroupMock, service.currentGroup);
      });

      it('setGroupCollection is a method', function () {
        expect(angular.isFunction(service.setGroupCollection)).toBe(true);
      });

      it('adds a node to an empty group', function () {
        service.setGroupCollection(inputTypeUuid1, selectionObj);
        expect(service.groupCollection[currentGroupMock][inputTypeUuid1][0].uuid)
          .toEqual(nodeUuid1);
      });

      it('adds additional node to the same group/input type (list)', function () {
        service.setGroupCollection(inputTypeUuid1, selectionObj);
        angular.copy({ uuid: nodeUuid2 }, nodeService.activeNodeRow);
        service.setGroupCollection(inputTypeUuid1, selectionObj);
        expect(service.groupCollection[currentGroupMock][inputTypeUuid1][1].uuid)
          .toEqual(nodeUuid2);
      });

      it('adds additional input type/node to a group', function () {
        service.setGroupCollection(inputTypeUuid1, selectionObj);
        angular.copy({ uuid: nodeUuid2 }, nodeService.activeNodeRow);
        service.setGroupCollection(inputTypeUuid2, selectionObj);
        expect(service.groupCollection[currentGroupMock][inputTypeUuid2][0].uuid)
          .toEqual(nodeUuid2);
      });

      it('removes a node', function () {
        service.setGroupCollection(inputTypeUuid1, selectionObj);
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid1] = false;
        service.setGroupCollection(inputTypeUuid1, selectionObj, nodeUuid1);
        expect(service.groupCollection[currentGroupMock][inputTypeUuid1].length)
          .toEqual(0);
      });
    });

    describe('setNodeSelectCollection', function () {
      var currentGroupMock = [0, 0];
      var inputTypeUuid1;
      var inputTypeUuid2;
      var nodeUuid1;
      var nodeUuid2;
      var selectionObj = {};

      beforeEach(function () {
        inputTypeUuid1 = mocker.generateUuid();
        inputTypeUuid2 = mocker.generateUuid();
        nodeUuid1 = mocker.generateUuid();
        nodeUuid2 = mocker.generateUuid();
        selectionObj[currentGroupMock] = {};
        selectionObj[currentGroupMock][inputTypeUuid1] = {};
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid1] = true;
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid2] = true;
        selectionObj[currentGroupMock][inputTypeUuid2] = {};
        selectionObj[currentGroupMock][inputTypeUuid2][nodeUuid1] = true;
        selectionObj[currentGroupMock][inputTypeUuid2][nodeUuid2] = true;

        angular.copy({ uuid: nodeUuid1 }, nodeService.activeNodeRow);
        angular.copy(currentGroupMock, service.currentGroup);
      });

      it('setNodeSelectCollection is a method', function () {
        expect(angular.isFunction(service.setNodeSelectCollection)).toBe(true);
      });

      it('adds a node to an empty node collection', function () {
        service.setNodeSelectCollection(inputTypeUuid1, selectionObj);
        expect(service.nodeSelectCollection[nodeUuid1].inputTypeList[0]).toEqual(inputTypeUuid1);
        expect(service.nodeSelectCollection[nodeUuid1].groupList[0]).toEqual(currentGroupMock);
      });

      it('adds additional inputType to same node/group', function () {
        service.setNodeSelectCollection(inputTypeUuid1, selectionObj);
        service.setNodeSelectCollection(inputTypeUuid2, selectionObj);
        expect(service.nodeSelectCollection[nodeUuid1].inputTypeList[1]).toEqual(inputTypeUuid2);
        expect(service.nodeSelectCollection[nodeUuid1].groupList[1]).toEqual(currentGroupMock);
      });

      it('adds additional node', function () {
        service.setNodeSelectCollection(inputTypeUuid1, selectionObj);
        angular.copy({ uuid: nodeUuid2 }, nodeService.activeNodeRow);
        service.setNodeSelectCollection(inputTypeUuid2, selectionObj);
        expect(service.nodeSelectCollection[nodeUuid2].inputTypeList[0]).toEqual(inputTypeUuid2);
        expect(service.nodeSelectCollection[nodeUuid2].groupList[0]).toEqual(currentGroupMock);
      });

      it('removes a node', function () {
        service.setNodeSelectCollection(inputTypeUuid1, selectionObj);
        selectionObj[currentGroupMock][inputTypeUuid1][nodeUuid1] = false;
        service.setNodeSelectCollection(inputTypeUuid1, selectionObj, nodeUuid1);
        expect(service.nodeSelectCollection[nodeUuid1].inputTypeList.length).toEqual(0);
      });
    });
  });
})();
