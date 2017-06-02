'use strict';

function dataSetAboutFactory (
  assayService,
  dataSetService,
  dataSetV2Service,
  fileStoreItemService,
  groupMemberService,
  sharingService,
  studyService
) {
  var assays = [];
  var dataSet = {};
  var dataSetSharing = {};
  var fileStoreItem = {};
  var groupList = [];
  var investigation = {};
  var isaTab = {};
  var studies = [];

  var getDataSet = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid
    };
    var dataSetRequest = dataSetService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response.objects[0], dataSet);
    });
    return dataSetRequest.$promise;
  };

  var updateDataSet = function (params) {
    var dataSetRequest = dataSetV2Service.partial_update(params);
    return dataSetRequest.$promise;
  };

  // For isa-archive and pre-isa-archive file download url
  var getFileStoreItem = function (isaUuid) {
    var params = {
      uuid: isaUuid
    };
    var fileStore = fileStoreItemService.query(params);
    fileStore.$promise.then(function (response) {
      angular.copy(response, fileStoreItem);
    });
    return fileStore.$promise;
  };

  // helper method returns only groups associated with data set
  var filterDataSetGroups = function (allGroups) {
    var filteredGroupList = [];
    for (var i = 0; i < allGroups.length; i++) {
      if (allGroups[i].perms.read || allGroups[i].perms.write) {
        filteredGroupList.push(allGroups[i]);
      }
    }
    return filteredGroupList;
  };

  var getDataSetSharing = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid,
      model: 'data_sets'
    };
    var dataSetRequest = sharingService.query(params);
    dataSetRequest.$promise.then(function (response) {
      angular.copy(response, dataSetSharing);
      var filteredGroups = filterDataSetGroups(response.share_list);
      angular.copy(filteredGroups, groupList);
    });
    return dataSetRequest.$promise;
  };

  // Get Studies associated with a data set
  var getStudies = function (dataSetUuid) {
    var params = {
      uuid: dataSetUuid
    };
    var study = studyService.query(params);
    study.$promise.then(function (response) {
      angular.copy(response.objects, studies);
    });
    return study.$promise;
  };

  // Get assays associated with a study
  var getStudysAssays = function (studyUuid) {
    var params = {
      study: studyUuid
    };
    var assay = assayService.query(params);
    assay.$promise.then(function (response) {
      angular.copy(response, assays);
    });
    return assay.$promise;
  };

  return {
    assays: assays,
    dataSet: dataSet,
    dataSetSharing: dataSetSharing,
    fileStoreItem: fileStoreItem,
    groupList: groupList,
    investigation: investigation,
    isaTab: isaTab,
    studies: studies,
    getDataSet: getDataSet,
    getDataSetSharing: getDataSetSharing,
    getFileStoreItem: getFileStoreItem,
    getStudies: getStudies,
    getStudysAssays: getStudysAssays,
    updateDataSet: updateDataSet
  };
}

angular
  .module('refineryDataSetAbout')
  .factory('dataSetAboutFactory', [
    'assayService',
    'dataSetService',
    'dataSetV2Service',
    'fileStoreItemService',
    'groupMemberService',
    'sharingService',
    'studyService',
    dataSetAboutFactory
  ]
);
