'use strict';

function VisWrapperCtrl ($q, pubSub, dashboardVisData) {
  this.$q = $q;
  this.pubSub = pubSub;

  // Absolute root node: OWL:Thing
  // The absolute root node is used for pruning the graph as it acts as a
  // single entry point.
  this.absRoot = 'http://www.w3.org/2002/07/owl#Thing';

  // Remix root nodes are a collection of nodes that act as meaningful entry
  // points across different ontologies in regards to browsing.
  this.remixRoots = [
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
  this.rename = [{
    uri: 'http://www.w3.org/2002/07/owl#Thing',
    label: 'Root'
  }, {
    uri: 'http://purl.obolibrary.org/obo/CHEBI_37577',
    label: 'Chemical compound'
  }];

  // Name of the property that is used to assess the size of a term.
  // E.g. if `Liver` is used to annotate 5 data sets then the size of `Liver`
  // is 5. The property of the term object is `dataSets` in this case.
  this.propertyValue = 'dataSets';

  // Trigger preloading / precomputing of D3 data for exploration.
  dashboardVisData.load(
    this.absRoot,
    this.propertyValue,
    this.remixRoots,
    this.rename
  );

  var graph = this.$q.defer();
  this.graph = graph.promise;

  var treemap = this.$q.defer();
  this.treemap = treemap.promise;

  var annotations = this.$q.defer();
  this.annotations = annotations.promise;

  dashboardVisData.data
    .then(function (results) {
      graph.resolve({
        graph: results.graph,
        rootIds: [results.root]
      });
      treemap.resolve(results.treemap);
      annotations.resolve(results.annotations);
    })
    .catch(function (error) {
      this.loading = false;
      if (error.number === 0) {
        this.error = true;
      } else {
        this.noData = true;
      }
    }.bind(this));

  this.loading = true;
  this.treemapLoading = $q.defer();

  this.pubSub.on('expandFinished', function () {
    this.ready = true;
  }.bind(this));

  this.pubSub.on('vis.show', function () {
    this.ready = true;
    this.invisible = false;
  }.bind(this));

  this.pubSub.on('collapsing', function () {
    this.ready = false;
  }.bind(this));

  this.pubSub.on('vis.hide', function () {
    this.ready = false;
  }.bind(this));

  this.pubSub.on('vis.tempHide', function () {
    this.invisible = true;
  }.bind(this));

  this.pubSub.on('treemap.loaded', function () {
    this.treemapLoading.resolve();
  }.bind(this));

  // Will be useful in the future when multiple services need to load.
  this.$q.all([this.treemapLoading.promise]).then(function () {
    this.loading = false;
  }.bind(this));
}

angular
  .module('refineryDashboard')
  .controller('VisWrapperCtrl', [
    '$q',
    'pubSub',
    'dashboardVisData',
    VisWrapperCtrl
  ]);
