'use strict';

/* eslint camelcase: 1 */


function nodeRelationshipService ($log, $window, NodeRelationshipResource) {
  var _createNodeRelationship = function (
    name, summary, type, is_current, success, error
  ) {
    var resource = new NodeRelationshipResource({
      study: '/api/v1/study/' + $window.externalStudyUuid + '/',
      assay: '/api/v1/assay/' + $window.externalAssayUuid + '/',
      node_pairs: [],
      name: name,
      summary: summary,
      type: type,
      is_current: is_current
    });
    resource.$save(success, error);
  };

  var createCurrentNodeRelationship = function (name, type, success, error) {
    _createNodeRelationship(name, type, '', true, success, error);
  };

  var createNodeRelationship = function (name, summary, type, success, error) {
    _createNodeRelationship(name, summary, type, false, success, error);
  };

  var deleteNodeRelationship = function (nodeRelationship, success, error) {
    $log.debug('Deleting node relationship ' + nodeRelationship.name + ' ...');
    if (nodeRelationship.is_current) {
      $log.error('Cannot delete current node relationship.');
    } else {
      NodeRelationshipResource.delete(
        {
          uuid: nodeRelationship.uuid
        },
        success,
        error
      );
    }
  };

  var updateNodeRelationship = function (nodeRelationship, success, error) {
    $log.debug('Updating node relationship ' + nodeRelationship.name + ' ...');
    if (nodeRelationship.is_current) {
      $log.error('Cannot update "current" node relationship.');
    } else {
      NodeRelationshipResource.update(
        {
          uuid: nodeRelationship.uuid
        },
        nodeRelationship,
        success,
        error
      );
    }
  };

  return ({
    createCurrentNodeRelationship: createCurrentNodeRelationship,
    createNodeRelationship: createNodeRelationship,
    deleteNodeRelationship: deleteNodeRelationship,
    updateNodeRelationship: updateNodeRelationship
  });
}

angular
  .module('refineryNodeRelationship')
  .service('nodeRelationshipService', [
    '$log', '$window', 'NodeRelationshipResource', nodeRelationshipService
  ]);
