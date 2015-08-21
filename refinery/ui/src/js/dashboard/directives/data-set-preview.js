function refineryDataSetPreview () {
  'use strict';

  function DataSetPreviewCtrl (
    _,
    $modal,
    authService,
    studyService,
    sharingService,
    citationService,
    analysisService,
    dashboardWidthFixerService,
    dashboardDataSetPreviewService,
    dashboardExpandablePanelService) {
    var that = this;

    this._ = _;
    this.$modal = $modal;
    this.user = authService;
    this.studyService = studyService;
    this.sharingService = sharingService;
    this.citationService = citationService;
    this.analysisService = analysisService;
    this.dashboardWidthFixerService = dashboardWidthFixerService;
    this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
    this.dashboardExpandablePanelService = dashboardExpandablePanelService;

    this.dashboardWidthFixerService.fixer.push(function () {
      that.style = {
        left: this.fixedWidth + 1
      };
    });

    this.dashboardDataSetPreviewService.addListener(
      'expandFinished',
      function () {
        this.animationFinished = true;
      }.bind(this)
    );

    this.dashboardExpandablePanelService.collapser.push(function () {
      this.animationFinished = false;
    }.bind(this));
  }

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'abstractLength', {
      configurable: false,
      enumerable: true,
      value: 128,
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
    'animationFinished', {
      configurable: false,
      enumerable: true,
      value: false,
      writable: true
  });

  Object.defineProperty(
    DataSetPreviewCtrl.prototype,
    'dataSet', {
      configurable: false,
      enumerable: true,
      get: function() {
        var ds = this.dashboardDataSetPreviewService.dataSet;
        if (ds && ds.uuid && this._currentDataset !== ds.id) {
          this._currentDataset = ds.id;
          this.getStudies(ds.uuid);
          this.getAnalysis(ds.uuid);
          this.getPermissions(ds.uuid);
        }
        return ds;
      }
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
    'studies', {
      configurable: false,
      enumerable: true,
      value: {},
      writable: true
  });

  DataSetPreviewCtrl.prototype.getAnalysis = function (uuid) {
    this.analysisService
      .query({
        data_set__uuid: uuid
      })
      .$promise
        .then(function (data) {
          this.numAnalyses = data.meta.total_count;
          this.analyses = data.objects;
        }.bind(this))
        .catch(function (error) {
          console.error(error);
        });
  };

  DataSetPreviewCtrl.prototype.getCitations = function (publications) {
    for (var i = 0, len = publications.length; i < len; i++) {
      var index = i,
          id = publications[i].pubmed_id | publications[i].doi;

      if (id) {
        this.loadCitation(publications, i, id);
      }
    }
  };

  DataSetPreviewCtrl.prototype.getStudies = function (uuid) {
    this.studyService
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
        }.bind(this))
        .catch(function (error) {
          console.error(error);
        });
  };

  DataSetPreviewCtrl.prototype.loadCitation = function (publications, index, id) {
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
      .catch(function (error) {
        console.error(error);
      });
  };

  /**
   * Load permissions for this dataset.
   *
   * @method  getPermissions
   * @author  Fritz Lekschas
   * @date    2015-08-21
   *
   * @param   {string}  uuid   UUID of the exact model entity.
   * @return  {object}         Angular promise.
   */
  DataSetPreviewCtrl.prototype.getPermissions = function (uuid) {
    var that = this;

    this.sharingService.get({
      model: 'data_sets',
      uuid: uuid
    }).$promise
      .then(function (data) {
        groups = [];
        for (var i = 0, len = data.share_list.length; i < len; i++) {
          groups.push({
            id: data.share_list[i].group_id,
            name: data.share_list[i].group_name,
            permission: that.getPermissionLevel(data.share_list[i].perms)
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
   * Open the permission modal
   *
   * @method  openPermissionEditor
   * @author  Fritz Lekschas
   * @date    2015-08-21
   */
  DataSetPreviewCtrl.prototype.openPermissionEditor = function () {
    var that = this;

    if (this.permissions) {
      this.$modal.open({
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

  DataSetPreviewCtrl.prototype.toggleAbstract = function (citation) {
    if (citation.abstractLength < Number.POSITIVE_INFINITY) {
      citation.abstractLength = Number.POSITIVE_INFINITY;
    } else {
      citation.abstractLength = this.abstractLength;
    }
  };

  return {
    bindToController: {
      close: '&'
    },
    controller: [
      '_',
      '$modal',
      'authService',
      'studyService',
      'sharingService',
      'citationService',
      'analysisService',
      'dashboardWidthFixerService',
      'dashboardDataSetPreviewService',
      'dashboardExpandablePanelService',
      DataSetPreviewCtrl],
    controllerAs: 'preview',
    restrict: 'E',
    replace: true,
    scope: {
      close: '&'
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
