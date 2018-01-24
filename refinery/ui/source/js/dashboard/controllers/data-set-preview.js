'use strict';

function DataSetPreviewCtrl (
  $log,
  $q,
  $scope,
  $window,
  _,
  $uibModal,
  pubSub,
  settings,
  userService,
  authService,
  studyService,
  dataSetAssayService,
  dataSetService,
  citationService,
  analysisService,
  dashboardDataSetPreviewService,
  dashboardExpandablePanelService,
  dataSetPermsService,
  dataSetTakeOwnershipService,
  dashboardDataSetsReloadService,
  filesize,
  DashboardIntrosDataSetSummary,
  permissionService
) {
  this.$log = $log;
  this.$q = $q;
  this.$window = $window;
  this._ = _;
  this.$uibModal = $uibModal;
  this.pubSub = pubSub;
  this.settings = settings;
  this.user = authService;
  this.userService = userService;
  this.studyService = studyService;
  this.assayService = dataSetAssayService;
  this.dataSetService = dataSetService;
  this.citationService = citationService;
  this.analysisService = analysisService;
  this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
  this.dashboardExpandablePanelService = dashboardExpandablePanelService;
  this.dataSetPermsService = dataSetPermsService;
  this.dataSetTakeOwnershipService = dataSetTakeOwnershipService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
  this.permissionService = permissionService;
  this.filesize = filesize;
  this.introsSatoriDataSetSummary = new DashboardIntrosDataSetSummary(this);
  this.importStatus = {};

  this.maxBadges = this.settings.dashboard.preview.maxBadges;
  this.infinity = Number.POSITIVE_INFINITY;

  this.pubSub.on('expandFinished', function () {
    this.animationFinished = true;
  }.bind(this));

  this.dashboardExpandablePanelService.collapser.push(function () {
    this.animationFinished = false;
  }.bind(this));

  this.descLength = this.settings.dashboard.preview.defaultLengthDescription;

  this.maxAnalyses = this.settings.dashboard.preview.maxAnalyses;

  // used to check perms regarding the import into own space button
  this.userPerms = 'none';
}

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'analyses', {
    enumerable: true,
    value: {},
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'dataSetUuid', {
    enumerable: true,
    get: function () {
      var uuid = this.dashboardDataSetPreviewService.dataSetUuid;
      if (uuid && this._currentUuid !== uuid) {
        this._currentUuid = uuid;
        this.loadData(uuid).then(function () {
          this.getUser(this.dataSetDetails.owner);
        }.bind(this));
      }
      return uuid;
    }
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'editIsOpen', {
    enumerable: true,
    value: true,
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'numAnalyses', {
    enumerable: true,
    value: 0,
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'numStudies', {
    enumerable: true,
    value: 0,
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'numAssays', {
    enumerable: true,
    value: 0,
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'studies', {
    enumerable: true,
    value: {},
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'assays', {
    enumerable: true,
    value: {},
    writable: true
  });

Object.defineProperty(
  DataSetPreviewCtrl.prototype,
  'totalFileSize', {
    enumerable: true,
    get: function () {
      if (this.dataSetDetails && this.dataSetDetails.file_size) {
        return this.filesize(this.dataSetDetails.file_size);
      }
      return 'Unknown';
    }
  });

DataSetPreviewCtrl.prototype.getAnalysis = function (uuid) {
  return this.analysisService
    .query({
      data_set__uuid: uuid
    })
    .$promise
    .then(function (data) {
      this.numAnalyses = data.meta.total_count;
      this.analyses = data.objects;
    }.bind(this))
    .catch(function (error) {
      this.$log.error(error);
    });
};

DataSetPreviewCtrl.prototype.getCitations = function (publications) {
  for (var i = 0, len = publications.length; i < len; i++) {
    var id = publications[i].pubmed_id | publications[i].doi;

    if (id) {
      this.loadCitation(publications, i, id);
    }
  }
};

/**
 * Load user data.
 *
 * @method  getUser
 * @author  Fritz Lekschas
 * @date    2015-10-21
 *
 * @param   {String}  uuid  User uuid.
 * @return  {Object}        Angular object returning `true` or an error.
 */
DataSetPreviewCtrl.prototype.getUser = function (uuid) {
  if (!uuid) {
    return this.$q.reject('No UUID');
  }

  return this.userService.get(uuid).then(function (user) {
    this.userName = user.fullName ? user.fullName : user.userName;
  }.bind(this));
};

DataSetPreviewCtrl.prototype.getStudies = function (uuid) {
  return this.studyService
    .get({
      uuid: uuid
    })
    .$promise
    .then(function (data) {
      this.numStudies = data.meta.total_count;
      if (this.numStudies === 1) {
        this.studies = data.objects[0];
        this.getCitations(this.studies.publications);
      } else {
        this.studies = data.objects;
      }
      // remove unnamed protocols
      var filteredProtocols = [];
      for (var i = 0; i < this.studies.protocols.length; i++) {
        if (this.studies.protocols[i].name) {
          filteredProtocols.push(this.studies.protocols[i]);
        }
      }
      angular.copy(filteredProtocols, this.studies.protocols);
    }.bind(this));
};

DataSetPreviewCtrl.prototype.getAssay = function (uuid) {
  return this.assayService
    .get({
      uuid: uuid
    })
    .$promise
    .then(function (data) {
      this.numAssays = data.meta.total_count;
      this.assays = data.objects;
    }.bind(this));
};

DataSetPreviewCtrl.prototype.getDataSetDetails = function (uuid) {
  return this.dataSetService
    .get({
      uuid: uuid
    })
    .$promise
    .then(function (data) {
      this.dataSetDetails = data.objects[0];
    }.bind(this));
};

/**
 * Import data set from public into private space.
 *
 * @method  importDataSet
 * @author  Fritz Lekschas
 * @date    2016-05-11
 */
DataSetPreviewCtrl.prototype.importDataSet = function () {
  var self = this;
  var dataSetUuid = this.dataSetDetails.uuid;

  // Only allow the user to click on the button once per page load.
  this.importDataSetStarted = true;

  if (!(this.importStatus.hasOwnProperty(dataSetUuid))) {
    this.isDataSetReImporting = true;
    self.importStatus[dataSetUuid] = { isDataSetReImporting: true };
    this.dataSetTakeOwnershipService
      .save({
        data_set_uuid: dataSetUuid
      })
      .$promise
      .then(function (data) {
        self.importStatus[dataSetUuid] = { isDataSetReImportSuccess: true };
        self.dashboardDataSetsReloadService.reload(true);
        self.dashboardDataSetPreviewService.preview(data.new_data_set_uuid);
      })
      .catch(function (error) {
        self.importStatus[this.dataSetDetails.uuid] = { isDataSetReImportFail: true };
        self.$log.error(error);
      })
      .finally(function () {
        self.importStatus[dataSetUuid].isDataSetReImporting = false;
      });
  }
};

DataSetPreviewCtrl.prototype.loadCitation = function (
  publications, index, id) {
  this.studies.publications[index].citation = {
    isLoading: true
  };

  this.citationService
    .get(id)
    .then(function (data) {
      publications[index].citation = this._.merge(
        {
          isLoading: false,
          abstractLength: this.settings.dashboard.preview.defaultLengthAbstract
        },
        data
      );
    }.bind(this))
    .catch(function () {
      this.citationError = true;
    }.bind(this));
};

/**
 * Load all relevant data for the preview.
 *
 * @method  loadData
 * @author  Fritz Lekschas
 * @date    2016-05-09
 *
 * @param   {String}  dataSetUuid  UUID if data set to be previewed.
 */
DataSetPreviewCtrl.prototype.loadData = function (dataSetUuid) {
  var that = this;
  this.importDataSetStarted = false;
  this.loading = true;
  this.permissionsLoading = true;
  this.userName = undefined;

  var dataSetDetails = this.getDataSetDetails(dataSetUuid);
  var studies = this.getStudies(dataSetUuid);
  var assays = this.getAssay(dataSetUuid);
  var analyses = this.getAnalysis(dataSetUuid);
  var permissions;

  if (dataSetUuid) {
    this.dataSetPermsService.getDataSetSharing(dataSetUuid).then(function (response) {
      that.userPerms = response.user_perms;
    });
  }

  permissions = this.user.isAuthenticated()
    .then(function (authenticated) {
      if (authenticated) {
        return this.permissionService.getPermissions(dataSetUuid);
      }
      return false;
    }.bind(this));

  permissions
    .finally(function () {
      this.permissionsLoading = false;
    }.bind(this));

  return this
    .$q
    .all([dataSetDetails, studies, analyses, assays])
    .then(function () {
      this.loading = false;
    }.bind(this))
    .catch(function () {
      // Should disable an error if both failed
      this.loading = false;
    }.bind(this));
};

/**
 * Open the permission modal.
 *
 * @method  openPermissionEditor
 * @author  Fritz Lekschas
 * @date    2015-08-21
 */
DataSetPreviewCtrl.prototype.openPermissionEditor = function () {
  var that = this;
  this.$uibModal.open({
    component: 'rpPermissionEditorModal',
    resolve: {
      config: function () {
        return {
          model: 'data_sets',
          uuid: that._currentUuid
        };
      }
    }
  }).result.catch(function () {
    // refresh data when user dismisses by clicking on the background
    that.permissionService.getPermissions(that._currentUuid);
    that.dashboardDataSetsReloadService.reload(true);
  });
};

/**
 * Toggle abstract length.
 *
 * @method  toggleAbstract
 * @author  Fritz Lekschas
 * @date    2016-05-09
 *
 * @param   {Object}  citation  Citation object.
 */
DataSetPreviewCtrl.prototype.toggleAbstract = function (citation) {
  if (citation.abstractLength < Number.POSITIVE_INFINITY) {
    citation.abstractLength = Number.POSITIVE_INFINITY;
  } else {
    citation.abstractLength = this.settings.dashboard.preview.defaultLengthAbstract;
  }
};

/**
 * Toggle number of visible badges.
 *
 * @method  toggleBadges
 * @author  Fritz Lekschas
 * @date    2015-08-21
 */
DataSetPreviewCtrl.prototype.toggleBadges = function () {
  if (this.maxBadges < Number.POSITIVE_INFINITY) {
    this.maxBadges = Number.POSITIVE_INFINITY;
  } else {
    this.maxBadges = this.settings.dashboard.preview.maxBadges;
  }
};

/**
 * Toggle length of description.
 *
 * @method  toggleDescription
 * @author  Fritz Lekschas
 * @date    2016-05-09
 */
DataSetPreviewCtrl.prototype.toggleDescription = function () {
  if (this.descLength < Number.POSITIVE_INFINITY) {
    this.descLength = Number.POSITIVE_INFINITY;
  } else {
    this.descLength = this.settings.dashboard.preview.defaultLengthDescription;
  }
};

angular
  .module('refineryDashboard')
  .controller('DataSetPreviewCtrl', [
    '$log',
    '$q',
    '$scope',
    '$window',
    '_',
    '$uibModal',
    'pubSub',
    'settings',
    'userService',
    'authService',
    'studyService',
    'dataSetAssayService',
    'dataSetService',
    'citationService',
    'analysisService',
    'dashboardDataSetPreviewService',
    'dashboardExpandablePanelService',
    'dataSetPermsService',
    'dataSetTakeOwnershipService',
    'dashboardDataSetsReloadService',
    'filesize',
    'DashboardIntrosDataSetSummary',
    'permissionService',
    DataSetPreviewCtrl
  ]);
