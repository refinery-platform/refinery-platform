'use strict';

function VisWrapperCtrl ($q, pubSub, dashboardVisData) {
  var self = this;

  self.$q = $q;
  self.pubSub = pubSub;
  self.dashboardVisData = dashboardVisData;

  // Absolute root node: OWL:Thing
  // The absolute root node is used for pruning the graph as it acts as a
  // single entry point.
  self.absRoot = 'http://www.w3.org/2002/07/owl#Thing';

  // Remix root nodes are a collection of nodes that act as meaningful entry
  // points across different ontologies in regards to browsing.
  self.remixRoots = [
    'http://purl.obolibrary.org/obo/BTO_0002666',
    'http://purl.obolibrary.org/obo/BTO_0000088',
    'http://purl.obolibrary.org/obo/BTO_0000421',
    'http://purl.obolibrary.org/obo/BTO_0000174',
    'http://purl.obolibrary.org/obo/BTO_0000522',
    'http://purl.obolibrary.org/obo/BTO_0000282',
    'http://purl.obolibrary.org/obo/BTO_0000570',
    'http://purl.obolibrary.org/obo/BTO_0005810',
    'http://purl.obolibrary.org/obo/BTO_0000634',
    'http://purl.obolibrary.org/obo/BTO_0001492',
    'http://purl.obolibrary.org/obo/BTO_0001485',
    'http://purl.obolibrary.org/obo/BTO_0001484',
    'http://purl.obolibrary.org/obo/BTO_0000203',
    'http://purl.obolibrary.org/obo/BTO_0000202',
    'http://purl.obolibrary.org/obo/BTO_0001486',
    'http://purl.obolibrary.org/obo/BTO_0001262',
    'http://purl.obolibrary.org/obo/BTO_0001493',
    'http://purl.obolibrary.org/obo/BTO_0003091',
    'http://purl.obolibrary.org/obo/BTO_0001491',
    'http://purl.obolibrary.org/obo/CL_0000003',
    'http://www.ebi.ac.uk/efo/EFO_0001444',
    'http://purl.obolibrary.org/obo/OBI_0000272',
    'http://www.ebi.ac.uk/efo/EFO_0000322',
    'http://www.ebi.ac.uk/efo/EFO_0000324',
    'http://purl.obolibrary.org/obo/CHEBI_37577',
    'http://purl.obolibrary.org/obo/OBI_0100026',
    'http://www.ebi.ac.uk/efo/EFO_0000787',
    'http://www.ebi.ac.uk/efo/EFO_0000408',
    'http://www.ebi.ac.uk/efo/EFO_0000323',
    'http://purl.org/sig/ont/fma/fma67513',
    'http://purl.org/sig/ont/fma/fma67498',
    'http://purl.org/sig/ont/fma/fma7149',
    'http://purl.obolibrary.org/obo/GO_0008150',
    'http://purl.obolibrary.org/obo/GO_0005575',
    'http://purl.obolibrary.org/obo/GO_0003674',
    'http://purl.obolibrary.org/obo/MA_0002433',
    'http://purl.obolibrary.org/obo/MA_0003001',
    'http://purl.obolibrary.org/obo/MA_0000003',
    'http://purl.obolibrary.org/obo/MA_0003002',
    'http://purl.bioontology.org/ontology/NCBITAXON/7742',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C3262',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C14282',
    'http://purl.obolibrary.org/obo/OBI_0000070',
    'http://purl.obolibrary.org/obo/PATO_0001241',
    'http://purl.obolibrary.org/obo/UO_0000000'
  ];

  // Currently OWL2NEO4J doesn't extract the preferred label and even then we
  // might want to rename certain nodes in case their label is confusing.
  self.rename = [{
    uri: 'http://www.w3.org/2002/07/owl#Thing',
    label: 'Root'
  }, {
    uri: 'http://purl.obolibrary.org/obo/CHEBI_37577',
    label: 'Chemical compound'
  }];

  // Name of the property that is used to assess the size of a term.
  // E.g. if `Liver` is used to annotate 5 data sets then the size of `Liver`
  // is 5. The property of the term object is `dataSets` in this case.
  self.propertyValue = 'dataSets';

  self.graphDeferred = self.$q.defer();
  self.graph = self.graphDeferred.promise;

  self.treemapDeferred = self.$q.defer();
  self.treemap = self.treemapDeferred.promise;

  self.annotationsDeferred = self.$q.defer();
  self.annotations = self.annotationsDeferred.promise;

  self.loading = true;
  self.treemapLoading = $q.defer();

  self.pubSub.on('expandFinished', function () {
    self.ready = true;
  });

  self.pubSub.on('vis.show', function () {
    self.ready = true;
    self.invisible = false;
  });

  self.pubSub.on('collapsing', function () {
    self.ready = false;
  });

  self.pubSub.on('vis.hide', function () {
    self.ready = false;
  });

  self.pubSub.on('vis.tempHide', function () {
    self.invisible = true;
  });

  self.pubSub.on('treemap.loaded', function () {
    self.treemapLoading.resolve();
  });

  // Will be useful in the future when multiple services need to load.
  self.$q.all([self.treemapLoading.promise]).then(function () {
    self.loading = false;
  });
}

Object.defineProperty(
  VisWrapperCtrl.prototype,
  'active', {
    enumerable: true,
    get: function () {
      return this._active;
    },
    set: function (value) {
      this._active = value;

      if (value) {
        this.loadData();
      }
    }
  }
);

VisWrapperCtrl.prototype.loadData = function () {
  var self = this;

  if (!self.loadingStarted) {
    self.loadingStarted = true;

    // Trigger preloading / precomputing of D3 data for exploration.
    self.dashboardVisData.load(
      self.absRoot,
      self.propertyValue,
      self.remixRoots,
      self.rename
    );

    self.dashboardVisData.data
      .then(function (results) {
        self.graphDeferred.resolve({
          graph: results.graph,
          rootIds: [results.root]
        });
        self.treemapDeferred.resolve(results.treemap);
        self.annotationsDeferred.resolve(results.annotations);
      })
      .catch(function (error) {
        self.loading = false;
        if (error.number === 0) {
          self.error = true;
        } else {
          self.noData = true;
        }
      });
  }
};

angular
  .module('refineryDashboard')
  .controller('VisWrapperCtrl', [
    '$q',
    'pubSub',
    'dashboardVisData',
    VisWrapperCtrl
  ]);
