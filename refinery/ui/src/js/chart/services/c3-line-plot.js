function C3LinePlotService() {

}

C3LinePlotService.prototype.generate = function (config) {
  config.data.x = 'x';

  var xAxisValues = ['x'].concat(
    Array.apply(null, new Array(config.data.length)).map(function (a, i) {
      return i + 1;
    })
  );

  config.data.columns.push(xAxisValues);

  return c3.generate({
    bindto: config.bindto,
    data: config.data,
    axis: {
      y: {
        max: (config.data.ymax !== undefined) ? config.data.ymax : null,
        min: (config.data.ymin !== undefined) ? config.data.ymin : null,
        padding: {
          top: 0,
          bottom: 0
        }
      } 
    }
  });
};

angular
  .module('refineryChart')
  .service('refineryC3LinePlotService', [C3LinePlotService]);