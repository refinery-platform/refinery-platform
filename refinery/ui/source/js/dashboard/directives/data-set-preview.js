'use strict';

function refineryDataSetPreview () {
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
    sharingService,
    citationService,
    analysisService,
    dashboardDataSetPreviewService,
    dashboardExpandablePanelService
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
    this.sharingService = sharingService;
    this.citationService = citationService;
    this.analysisService = analysisService;
    this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
    this.dashboardExpandablePanelService = dashboardExpandablePanelService;

    this.maxBadges = this.settings.dashboard.preview.maxBadges;
    this.infinity = Number.POSITIVE_INFINITY;

    this.pubSub.on('expandFinished', function () {
      this.animationFinished = true;
    }.bind(this));

    this.dashboardExpandablePanelService.collapser.push(function () {
      this.animationFinished = false;
    }.bind(this));

    this.descLength = this.descDefaultLength;
  }

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'abstractLength', {
      configurable: false,
      enumerable: true,
      value: 256,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'analyses', {
      configurable: false,
      enumerable: true,
      value: {},
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'dataSet', {
      configurable: false,
      enumerable: true,
      get: function () {
        var ds = this.dashboardDataSetPreviewService.dataSet;
        if (ds && ds.uuid && this._currentDataset !== ds.id) {
          this._currentDataset = ds.id;
          this.loadData(ds);
        }
        return ds;
      }
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'descDefaultLength', {
      configurable: false,
      enumerable: true,
      value: 384,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'editIsOpen', {
      configurable: false,
      enumerable: true,
      value: true,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'numAnalyses', {
      configurable: false,
      enumerable: true,
      value: 0,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'numStudies', {
      configurable: false,
      enumerable: true,
      value: 0,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'numAssays', {
      configurable: false,
      enumerable: true,
      value: 0,
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'studies', {
      configurable: false,
      enumerable: true,
      value: {},
      writable: true
    });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'assays', {
      configurable: false,
      enumerable: true,
      value: {},
      writable: true
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
   * Load user data
   *
   * @method  getUser
   * @author  Fritz Lekschas
   * @date    2015-10-21
   *
   * @param   {String}  uuid  User uuid.
   * @return  {Object}        Angular object returning `true` or an error.
   */
  DataSetPreviewCtrl.prototype.getUser = function (uuid) {
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
            abstractLength: this.abstractLength
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
   * @date    2015-10-21
   *
   * @param   {Object}  Dataset to be previewed.
   */
  DataSetPreviewCtrl.prototype.loadData = function (dataset) {
    this.loading = true;
    this.permissionsLoading = true;
    this.userName = undefined;

    var studies = this.getStudies(dataset.uuid);
    var assays = this.getAssay(dataset.uuid);
    var analyses = this.getAnalysis(dataset.uuid);
    var permissions;

    permissions = this.user.isAuthenticated()
      .then(function (authenticated) {
        if (authenticated) {
          return this.getPermissions(dataset.uuid);
        }
        return false;
      }.bind(this));

    this
      .$q
      .all([studies, analyses, assays])
      .then(function () {
        this.loading = false;
      }.bind(this))
      .catch(function () {
        // Should disable an error if both failed
        this.loading = false;
      }.bind(this));

    permissions
      .finally(function () {
        this.permissionsLoading = false;
      }.bind(this));
  };

  /**
   * Open the permission modal
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
              uuid: that.dataSet.uuid
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
   * Toggle abstract length
   *
   * @method  toggleAbstract
   * @author  Fritz Lekschas
   * @date    2015-08-21
   *
   * @param   {Object  citation  Citation object.
   */
  DataSetPreviewCtrl.prototype.toggleAbstract = function (citation) {
    if (citation.abstractLength < Number.POSITIVE_INFINITY) {
      citation.abstractLength = Number.POSITIVE_INFINITY;
    } else {
      citation.abstractLength = this.abstractLength;
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
   * Toggle abstract length
   *
   * @method  toggleAbstract
   * @author  Fritz Lekschas
   * @date    2015-08-21
   *
   * @param   {Object  citation  Citation object.
   */
  DataSetPreviewCtrl.prototype.toggleDescription = function () {
    if (this.descLength < Number.POSITIVE_INFINITY) {
      this.descLength = Number.POSITIVE_INFINITY;
    } else {
      this.descLength = this.descDefaultLength;
    }
  };

  return {
    bindToController: {
      close: '&',
      active: '='
    },
    controller: [
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
      'sharingService',
      'citationService',
      'analysisService',
      'dashboardDataSetPreviewService',
      'dashboardExpandablePanelService',
      DataSetPreviewCtrl],
    controllerAs: 'preview',
    restrict: 'E',
    replace: true,
    scope: {
      close: '&',
      active: '='
    },
    templateUrl: '/static/partials/dashboard/directives/data-set-preview.html',
    transclude: true
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDataSetPreview', [
    refineryDataSetPreview
  ]);
