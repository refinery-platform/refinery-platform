'use strict';

function DataSetStoreFactory () {
  /**
   * Stores the data objects.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @type  {Object}
   */
  var _store = {};

  /**
   * DataSetStore constructor class
   *
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @class
   */
  function DataSetStore () {
  }

  /**
   * Add a data object to the store.
   *
   * @method  add
   * @author  Fritz Lekschas
   * @date    2015-10-29
   *
   * @param   {Number|String}  key     Key for identifing the object.
   * @param   {Object}         data    Actual data object.
   * @param   {Boolean}        update  If `true` will update existing objects.
   * @param   {Boolean}        set     If `true` will add non-existent data.
   * @return  {Object}                 Self for chaining.
   */
  DataSetStore.prototype.add = function (key, data, update) {
    // Triple `!!!` is the negated boolean representation of the expression
    if (!!!_store[key]) {
      _store[key] = data;
    } else {
      if (update) {
        this.update(key, data);
      }
    }

    return this;
  };

  /**
   * Run a callback function on every data set
   *
   * @method  each
   * @author  Fritz Lekschas
   * @date    2017-01-13
   * @param   {Function}  callback  Function to be called on every data set
   */
  DataSetStore.prototype.each = function (callback) {
    var keys = Object.keys(_store);

    for (var i = keys.length; i--;) {
      callback(_store[keys[i]]);
    }
  };

  /**
   * Get a data object to the store.
   *
   * @method  get
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number|String}  key   Key for identifing the object..
   * @return  {Object}               Self for chaining.
   */
  DataSetStore.prototype.get = function (key) {
    return _store[key];
  };

  /**
   * Update a data object without destroying its original reference.
   *
   * @description
   * Batch update of a dataset according with data.
   *
   * @method  update
   * @author  Fritz Lekschas
   * @date    2015-11-02
   *
   * @param   {Number|String}  key   Key to identify the data object.
   * @param   {Object}         data  Actual data object.
   * @return  {Object}               Self for chaining.
   */
  DataSetStore.prototype.update = function (key, data) {
    // Todo: Implement a deep cloning update function that doesn't destroy
    // references by accidentally replacing whole objects.
    if (!!_store[key]) {
      var keys = Object.keys(data);
      for (var i = keys.length; i--;) {
        _store[key][keys[i]] = data[keys[i]];
      }
    }

    return this;
  };

  /**
   * Remove a data object from the store.
   *
   * @method  remove
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number|String}  key  Key to identify the data object.
   * @return  {Object}              Self for chaining.
   */
  DataSetStore.prototype.remove = function (key) {
    // `void 0` always evaluates to `undefined`. This is a bit safer because
    // `undefined` could potentially be corrupted, e.g. `undefined = true`.
    if (!!_store[key]) {
      _store[key] = void 0;
    }

    return this;
  };

  /**
   * Set a new attribute.
   *
   * @description
   * This method allows to set a single or multiple attributes. Existing
   * attribute values will be overwritten.
   *
   * @example
   * ```
   * DataSetStore.set('myId', {highlight: true, color: '#000'});
   * ```
   *
   * @method  set
   * @author  Fritz Lekschas
   * @date    2015-11-02
   *
   * @param   {Number|String}  key    Key to identify the data object.
   * @param   {Object}         attrs  Object containing the key value pairs.
   * @return  {Object}                Self for chaining.
   */
  DataSetStore.prototype.set = function (key, attrs) {
    if (!!_store[key]) {
      var keys = Object.keys(attrs);

      for (var i = keys.length; i--;) {
        _store[key][keys[i]] = attrs[keys[i]];
      }
    }

    return this;
  };

  /**
   * Number of files currently stored.
   *
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @type  {Number}
   */
  Object.defineProperty(
    DataSetStore.prototype,
    'length',
    {
      enumerable: true,
      get: function () {
        return Object.keys(_store).length;
      }
    }
  );

  return DataSetStore;
}

angular
  .module('dataSet')
  .factory('DataSetStore', [
    '_',
    DataSetStoreFactory
  ]);
