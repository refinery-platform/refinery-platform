function ChartCtrl($http, $stateParams, fastqcDataService, refineryBoxPlotService, refineryC3LinePlotService) {
  var that = this;
  that.$stateParams = $stateParams;
  that.fastqcDataService = fastqcDataService;
  that.refineryBoxPlotService = refineryBoxPlotService;
  that.refineryC3LinePlotService = refineryC3LinePlotService;

  console.log(this.$stateParams);

  if (this.$stateParams &&
      this.$stateParams.uuid &&
      isValidUUID(this.$stateParams.uuid)) {
    this.fastqcDataService.get({
      uuid: that.$stateParams.uuid
    }).$promise.then(function (data) {
        that.plot(data.data, that.$stateParams.mode);
      }).catch(function (error) {
        console.error(error);
      }
    );
  }
}

Object.defineProperty(
  ChartCtrl.prototype,
  'modeList', {
    enumerable: true,
    configurable: false,
    get: function () {
      return [
        'per_base_sequence_quality',
        'per_sequence_quality_scores',
        'per_base_sequence_content',
        'per_sequence_gc_content',
        'per_base_n_content',
        'sequence_length_distribution',
        'sequence_duplication_level',
        'overrepresented_sequences',
        'adapter_content',
        'kmer_content'
      ];
    }
  }
);

Object.defineProperty(
  ChartCtrl.prototype,
  'bindto', {
    enumerable: true,
    configurable: false,
    get: function () {
      return '.fastqc-chart-drawspace';
    }
  }
);

function isValidUUID(uuid) {
  var isStr = typeof uuid === 'string' || uuid instanceof (String);

  if (!isStr) {
    return false;
  }

  if (uuid.length !== 36) {
    return false;
  }

  var split = uuid.split('-');

  if (split.length !== 5 &&
      split[0].length !== 8 &&
      split[1].length !== 4 &&
      split[2].length !== 4 &&
      split[3].length !== 4 &&
      split[4].length !== 12) {
    return false;
  }

  return true;
}

ChartCtrl.prototype.plot = function (data, mode) {
  var that = this;
  mode = mode && this.modeList.indexOf(mode) > -1 ?
    mode : 'per_base_sequence_quality';

  if (!data[mode] && !(data[mode] instanceof (Array))) {
    console.error("Invalid data type returned");
  }

  if (mode === 'per_base_sequence_quality') {
    this.draw_per_base_sequence_quality(data[mode]);
  } else if (mode === 'per_sequence_quality_scores') {
    this.draw_per_sequence_quality_scores(data[mode]);
  } else if (mode === 'per_base_sequence_content') {
    this.draw_per_base_sequence_content(data[mode]);
  } else if (mode === 'per_sequence_gc_content') {
    this.draw_per_sequence_gc_content(data[mode]);
  } else if (mode === 'per_base_n_content') {
    this.draw_per_base_n_content(data[mode]);
  } else if (mode === 'sequence_length_distribution') {
    this.draw_sequence_length_distribution(data[mode]);
  } else if (mode === 'sequence_duplication_level') {
    this.draw_sequence_duplication_level(data[mode]);
  } else if (mode === 'overrepresented_sequences') {
    this.draw_overrepresented_sequences(data[mode]);
  } else if (mode === 'adapter_content') {
    this.draw_adapter_content(data[mode]);
  } else if (mode === 'kmer_content') {
    this.draw_kmer_content(data[mode]);
  } else {
    this.draw_per_base_sequence_quality(data[mode]);
  }
};


ChartCtrl.prototype.draw_per_base_sequence_quality = function (data) {
  console.log(this);
  var chart = this.refineryBoxPlotService.generate({
    data: data.slice(1).map(function (d) {
      return {
        kind: 'A',
        label: d[0],
        mean: d[1],
        med: d[2],
        q1: d[3],
        q3: d[4],
        min: d[5],
        max: d[6]
      };
    }),
    config: {
      bindto: this.bindto
    }
  });
};

ChartCtrl.prototype.draw_per_sequence_quality_scores = function (data) {
  var chart = this.refineryC3LinePlotService.generate({
    bindto: config.bindto,
    data: {
      length: data_wrapper.data.length - 1,
      ymin: 0,
      columns: [data_wrapper.data]
    }
  });
};

ChartCtrl.prototype.draw_per_base_sequence_content = function (data) {
  var chart = this.refineryC3LinePlotService.generate({
    bindto: config.bindto,
    data: {
      length: data_wrapper.data.T.length - 1,
      ymin: 0,
      ymax: 100,
      columns: [
        data_wrapper.data.T,
        data_wrapper.data.A,
        data_wrapper.data.G,
        data_wrapper.data.C
      ]
    }
  });
};

ChartCtrl.prototype.draw_per_sequence_gc_content = function (data) {
  var chart = this.refineryC3LinePlotService.generate({
    bindto: config.bindto,
    data: {
      length: data_wrapper.data.length - 1,
      ymin: 0,
      columns: [
        data_wrapper.data
      ]
    }
  });
};

ChartCtrl.prototype.draw_per_base_n_content = function (data, config) {
  var chart = this.refineryC3LinePlotService.generate({
    bindto: config.bindto,
    data: {
      length: data_wrapper.data.length - 1,
      ymin: 0,
      ymax: 100,
      columns: [
        data_wrapper.data
      ]
    }
  });
};

ChartCtrl.prototype.draw_sequence_length_distribution = function (data, config) {

};

ChartCtrl.prototype.draw_sequence_duplication_level = function (data, config) {
  var chart = this.refineryC3LinePlotService.generate({
    bindto: config.bindto,
    data: {
      length: data_wrapper.data.length - 1,
      ymin: 0,
      ymax: 100,
      columns: [
        data_wrapper.data
      ]
    }
  });
};

ChartCtrl.prototype.draw_overrepresented_sequences = function (data, config) {

};

ChartCtrl.prototype.draw_adapter_content = function (data, config) {

};

ChartCtrl.prototype.draw_kmer_content = function (data, config) {

};


angular
  .module('refineryChart')
  .controller("refineryChartCtrl", [
    '$http',
    '$stateParams',
    'fastqcDataService',
    'refineryBoxPlotService',
    'refineryC3LinePlotService',
    ChartCtrl
  ]);

