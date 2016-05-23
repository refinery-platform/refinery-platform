'use strict';

function DataSetPreviewCtrl (
  $log,
  $q,
  _,
  $uibModal,
  pubSub,
  settings,
  userService,
  authService,
  studyService,
  assayService,
  dataSetService,
  sharingService,
  citationService,
  analysisService,
  dashboardDataSetPreviewService,
  dashboardExpandablePanelService,
  dataSetTakeOwnershipService,
  dashboardDataSetsReloadService,
  filesize
) {
  this.$log = $log;
  this.$q = $q;
  this._ = _;
  this.$uibModal = $uibModal;
  this.pubSub = pubSub;
  this.settings = settings;
  this.user = authService;
  this.userService = userService;
  this.studyService = studyService;
  this.assayService = assayService;
  this.dataSetService = dataSetService;
  this.sharingService = sharingService;
  this.citationService = citationService;
  this.analysisService = analysisService;
  this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
  this.dashboardExpandablePanelService = dashboardExpandablePanelService;
  this.dataSetTakeOwnershipService = dataSetTakeOwnershipService;
  this.dashboardDataSetsReloadService = dashboardDataSetsReloadService;
  this.filesize = filesize;

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
 * Load permissions for this dataset.
 *
 * @method  getPermissions
 * @author  Fritz Lekschas
 * @date    2015-08-21
 *
 * @param   {String}  uuid   UUID of the exact model entity.
 * @return  {Object}         Angular promise.
 */
DataSetPreviewCtrl.prototype.getPermissions = function (uuid) {
  return this.sharingService.get({
    model: 'data_sets',
    uuid: uuid
  }).$promise
    .then(function (data) {
      var groups = [];
      for (var i = 0, len = data.share_list.length; i < len; i++) {
        groups.push({
          id: data.share_list[i].group_id,
          name: data.share_list[i].group_name,
          permission: this.getPermissionLevel(data.share_list[i].perms)
        });
      }
      this.permissions = {
        isOwner: data.is_owner,
        groups: groups
      };
    }.bind(this));
};

/**
 * Turns permission object into a simple string.
 *
 * @method  getPermissions
 * @author  Fritz Lekschas
 * @date    2015-08-21
 *
 * @param   {Object}  perms  Object of the precise permissions.
 * @return  {String}         Permission's name.
 */
DataSetPreviewCtrl.prototype.getPermissionLevel = function (perms) {
  if (perms.read === false) {
    return 'none';
  }
  if (perms.change === true) {
    return 'edit';
  }
  return 'read';
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

  // Only allow the user to click on the button once per page load.
  this.importDataSetStarted = true;

  if (!this.isDataSetReImporting) {
    this.isDataSetReImporting = true;
    this.dataSetTakeOwnershipService
      .save({
        data_set_uuid: this.dataSetDetails.uuid
      })
      .$promise
      .then(function (data) {
        self.isDataSetReImportSuccess = true;
        self.dashboardDataSetsReloadService.reload(true);
        self.dashboardDataSetPreviewService.preview(data.new_data_set_uuid);
      })
      .catch(function (error) {
        self.isDataSetReImportFail = true;
        self.$log.error(error);
      })
      .finally(function () {
        self.isDataSetReImporting = false;
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
  this.importDataSetStarted = false;
  this.loading = true;
  this.permissionsLoading = true;
  this.userName = undefined;

  var dataSetDetails = this.getDataSetDetails(dataSetUuid);
  var studies = this.getStudies(dataSetUuid);
  var assays = this.getAssay(dataSetUuid);
  var analyses = this.getAnalysis(dataSetUuid);
  var permissions;

  permissions = this.user.isAuthenticated()
    .then(function (authenticated) {
      if (authenticated) {
        return this.getPermissions(dataSetUuid);
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

  if (this.permissions) {
    this.$uibModal.open({
      templateUrl: '/static/partials/dashboard/partials/permission-dialog.html',
      controller: 'PermissionEditorCtrl as modal',
      resolve: {
        config: function () {
          return {
            model: 'data_sets',
            uuid: that._currentUuid
          };
        },
        permissions: function () {
          return that.permissions;
        }
      }
    });
  }
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
    '_',
    '$uibModal',
    'pubSub',
    'settings',
    'userService',
    'authService',
    'studyService',
    'assayService',
    'dataSetService',
    'sharingService',
    'citationService',
    'analysisService',
    'dashboardDataSetPreviewService',
    'dashboardExpandablePanelService',
    'dataSetTakeOwnershipService',
    'dashboardDataSetsReloadService',
    'filesize',
    DataSetPreviewCtrl
  ]);
