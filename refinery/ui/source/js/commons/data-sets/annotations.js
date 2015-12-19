function DataSetAnnotationsFactory (_, dataSetAnnotationService) {
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
      _annotations[uris[i]].recallTotal = _annotations[uris[i]].recallTotal;
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
      configurable: false,
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
   * @param   {String}  uri  URI of annoation term.
   * @return  {Object}       Annotation term.
   */
  DataSetAnnotations.prototype.get = function (uri) {
    return _annotations[uri];
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
    return dataSetAnnotationService
        .query().$promise.then(function (annotations) {
        var keys = Object.keys(annotations);

        for (var i = keys.length; i--;) {
          _addAnnotationsToDataSet(keys[i], annotations[keys[i]]);

          for (var j = annotations[keys[i]].length; j--;) {
            this.add(annotations[keys[i]].term, keys[i]);
          }
        }

        _initPR();
      }.bind(this));
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
    var i,
        uris = Object.keys(annotations);

    for (i = terms.length; i--;) {
      _annotations[terms[i]].precision = annotations[uris[i]] / numDataSets;
      _annotations[terms[i]].recall = annotations[uris[i]] / _annotations[terms[i]].total;
    }
  };

  return DataSetAnnotations;
}

angular
  .module('dataSet')
  .factory('DataSetAnnotations', [
    '_',
    'dataSetAnnotationService',
    DataSetAnnotationsFactory
  ]);
