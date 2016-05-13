'use strict';

function DataSetAnnotationsFactory ($q, _, dataSetAnnotationService) {
  /**
   * Stores the dataset annotations.
   *
   * @author  Fritz Lekschas
   * @date    2015-12-17
   *
   * @type  {Object}
   */
  var _annotations = {};

  /**
   * Stores the dataset store.
   *
   * @author  Fritz Lekschas
   * @date    2015-12-18
   *
   * @type  {Object}
   */
  var _dataSets;

  /**
   * Determines whether annotations have been loaded or not.
   *
   * @description
   * This is used to ensure that annotations are loaded **only** once.
   *
   * @type  {Boolean}
   */
  var _loading = false;

  /**
   * Add annotations to the data store.
   *
   * @method  _addAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-09
   *
   * @param   {Object}  data  Object holding the annotations per dataset.
   */
  function _addAnnotationsToDataSet (dataSetId, annotations) {
    _dataSets.add(
      dataSetId,
      {
        annotations: annotations
      },
      true
    );
  }

  /**
   * Initialize precision and recall.
   *
   * @description
   * Precision: Number of data sets annotation with a term / total number of
   * data sets.
   * PrecisionTotal: Precision for a term in relation to the overall set of
   * data sets.
   *
   * @method  _initPR
   * @author  Fritz Lekschas
   * @date    2015-12-18
   */
  function _initPR () {
    var uris = Object.keys(_annotations);

    for (var i = uris.length; i--;) {
      _annotations[uris[i]].precision = _annotations[uris[i]].total /
      _dataSets.length;
      _annotations[uris[i]].precisionTotal = _annotations[uris[i]].precision;
      _annotations[uris[i]].recall = 1;
    }
  }

  /**
   * Data set annotation term
   *
   * @method  DataSetAnnotation
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {String}  uri  Term URI.
   */
  function DataSetAnnotation (uri) {
    this.uri = uri;
    this.dataSets = {};
    this.precision = 1;
    this.recall = 1;
  }

  Object.defineProperty(
    DataSetAnnotation.prototype,
    'total', {
      enumerable: true,
      get: function () {
        return Object.keys(this.dataSets).length;
      }
    });

  /**
   * Link dataset to annotation term.
   *
   * @method  addDataSet
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {Integer}  dataSetId  DataSet ID.
   */
  DataSetAnnotation.prototype.addDataSet = function (dataSetId) {
    this.dataSets[dataSetId] = _dataSets[dataSetId];
  };

  /**
   * Collection of dataset annotation terms.
   *
   * @method  DataSetAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {Object}  dataSets  DataSet store.
   */
  function DataSetAnnotations (dataSets) {
    _dataSets = dataSets;
  }

  /**
   * Add annotation term to collection of annotation terms.
   *
   * @method  add
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {String}   term       Annotation term's URI.
   * @param   {Integer}  dataSetId  DataSet ID.
   * @return  {Object}   Self.
   */
  DataSetAnnotations.prototype.add = function (term, dataSetId) {
    // Triple `!!!` is the negated boolean representation of the expression
    if (!!!_annotations[term]) {
      _annotations[term] = new DataSetAnnotation(term);
    }

    _annotations[term].addDataSet(dataSetId);

    return this;
  };

  /**
   * Get an annotation based on the URI.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {String|Array|Undefined}  uri  URI of annoation term, an array of
   *   URIs or `undefined` to return all annotations.
   * @return  {Object|Array}                 A single annotation term or an
   *   array of annotation terms.
   */
  DataSetAnnotations.prototype.get = function (uri) {
    var deferred = $q.defer();

    if (!_loading) {
      deferred.reject('No annotations loaded');
    }

    _loading.promise.then(function () {
      var response = {};

      if (!uri || _.isObject(uri)) {
        var uris = uri ? Object.keys(uri) : Object.keys(_annotations);
        for (var i = uris.length; i--;) {
          response[uris[i]] = _annotations[uris[i]];
        }
      }

      if (_.isString(uri)) {
        response = _annotations[uri];
      }

      deferred.resolve(response);
    });

    return deferred.promise;
  };

  /**
   * Load all annotations.
   *
   * @method  load
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @return  {Object}  Promise that resolves to the loaded annotations.
   */
  DataSetAnnotations.prototype.load = function () {
    // Make sure to only load all annotations once.
    if (!_loading) {
      _loading = $q.defer();

      dataSetAnnotationService.query().$promise.then(function (annotations) {
        var dataSetIds = Object.keys(annotations);

        for (var i = dataSetIds.length; i--;) {
          _addAnnotationsToDataSet(dataSetIds[i], annotations[dataSetIds[i]]);

          for (var j = annotations[dataSetIds[i]].length; j--;) {
            this.add(annotations[dataSetIds[i]][j].term, dataSetIds[i]);
          }
        }

        _initPR();

        _loading.resolve(true);
      }.bind(this));
    }

    return _loading.promise;
  };

  /**
   * Calculates precision and recall of a set of annotations given the total
   * number of results.
   *
   * @method  calcPR
   * @author  Fritz Lekschas
   * @date    2015-12-18
   * @param   {Object}  annotations  Object containing the current set of
   *   annotations. E.g. `{ URI: NUMBER_USED }`.
   * @param   {Array}   dataSetIds   [description]
   * @return  {Object}               Self.
   */
  DataSetAnnotations.prototype.calcPR = function (annotations, numDataSets) {
    var uris = Object.keys(annotations);

    for (var i = uris.length; i--;) {
      _annotations[uris[i]].precision = annotations[uris[i]] / numDataSets;
      _annotations[uris[i]].recall = annotations[uris[i]] / _annotations[uris[i]].total;
    }
  };

  return DataSetAnnotations;
}

angular
  .module('dataSet')
  .factory('DataSetAnnotations', [
    '$q',
    '_',
    'dataSetAnnotationService',
    DataSetAnnotationsFactory
  ]);
