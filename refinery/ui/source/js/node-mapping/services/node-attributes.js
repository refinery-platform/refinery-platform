'use strict';

function NodeAttributesFactory (settings, solrService) {
  function nodeAttributes (studyUuid, assayUuid, nodeUuid, attributeList) {
    return solrService.get({
      // Fields that are returned
      fl: attributeList,
      // Limit search space to data sets only
      fq: [(
        '(' +
        'uuid:' + nodeUuid + ' AND ' +
        'study_uuid:' + studyUuid + ' AND ' +
        'assay_uuid:' + assayUuid +
        ')'
      ), (
        'type:(' +
        '"Raw Data File" OR ' +
        '"Derived Data File" OR ' +
        '"Array Data File" OR ' +
        '"Derived Array Data File" OR ' +
        '"Array Data Matrix File" OR ' +
        '"Derived Array Data Matrix File"' +
        ')'
      )],
      // Query
      q: 'django_ct:data_set_manager.node',
      // # results returned
      rows: 20,
      // Start of return
      start: 0
    }, {
      index: 'data_set_manager'
    }).$promise;
  }
  return nodeAttributes;
}

angular
  .module('refineryNodeMapping')
  .factory('nodeAttributes', [
    'settings',
    'solrService',
    NodeAttributesFactory
  ]);
