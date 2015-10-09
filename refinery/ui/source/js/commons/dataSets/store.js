function DataSetStoreFactory (_) {
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
  function DataSetStore () {}

  /**
   * Add a data object to the store.
   *
   * @method  add
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number|String}  key   Key for identifing the object.
   * @param   {Object}         data  Actual data object.
   * @return  {Object}               Self for chaining.
   */
  DataSetStore.prototype.add = function(key, data) {
    // Triple `!!!` is the negated boolean representation of the expression
    if (!!!_store[key]) {
      _store[key] = data;
    }

    return DataSetStore;
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
  DataSetStore.prototype.get = function(key) {
    return _store[key];
  };

  /**
   * Update a data object without destroying its original reference.
   *
   * @method  update
   * @author  Fritz Lekschas
   * @date    2015-10-08
   *
   * @param   {Number|String}  key   Key to identify the data object.
   * @param   {Object}         data  Actual data object.
   * @return  {Object}               Self for chaining.
   */
  DataSetStore.prototype.update = function(key, data) {
    // Todo: Implement a deep cloning update function that doesn't destroy
    // references by accidentally replacing whole objects.

    return DataSetStore;
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
  DataSetStore.prototype.remove = function(key) {
    // `void 0` always evaluates to `undefined`. This is a bit safer because
    // `undefined` could potentially be corrupted, e.g. `undefined = true`.
    if (!!_store[key]) {
      _store[key] = void 0;
    }

    return DataSetStore;
  };

  return DataSetStore;
}

angular
  .module('dataset')
  .factory('DataSetStore', [
    '_',
    DataSetStoreFactory
  ]);
