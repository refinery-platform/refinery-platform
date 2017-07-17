'use strict';

function VisWrapperCtrl (
  $q,
  pubSub,
  dashboardVisData,
  dashboardVisQueryTerms,
  dashboardVisWrapperResizer,
  DashboardIntrosSatoriListGraph,
  DashboardIntrosSatoriTreemap,
  dashboardIntroStarter,
  treemapContext
) {
  var self = this;

  self.$q = $q;
  self.pubSub = pubSub;
  self.dashboardVisData = dashboardVisData;
  self.queryTerms = dashboardVisQueryTerms;
  self.dashboardVisWrapperResizer = dashboardVisWrapperResizer;
  self.introsSatoriListGraph = new DashboardIntrosSatoriListGraph();
  self.introsSatoriTreemap = new DashboardIntrosSatoriTreemap();

  self.initVis = treemapContext.get('initVis');

  // Absolute root node: OWL:Thing
  // The absolute root node is used for pruning the graph as it acts as a
  // single entry point.
  self.absRoot = 'http://www.w3.org/2002/07/owl#Thing';

  // Remix root nodes are a collection of nodes that act as meaningful entry
  // points across different ontologies in regards to browsing.
  self.remixRoots = [
    'http://bioontology.org/ontologies/BiomedicalResourceOntology.owl#Information_Resource',
    'http://bioontology.org/ontologies/BiomedicalResourceOntology.owl#Software',
    'http://bioontology.org/ontologies/ResearchArea.owl#Area_of_Research',
    'http://bioontology.org/projects/ontologies/birnlex#Process',
    'http://cerrado.linkeddata.es/ecology/ccon#BiologicalOrganizationLevel',
    'http://edamontology.org/data_0006',
    'http://edamontology.org/operation_0004',
    'http://lsdis.cs.uga.edu/projects/glycomics/propreo#instrument_component',
    'http://lsdis.cs.uga.edu/projects/glycomics/propreo#organism',
    'http://mimi.case.edu/ontologies/2009/1/UnitsOntology#unit',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C14282',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C3262',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#Organ',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#Organisms',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#Tissue',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C12219',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C22188',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C16326',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C16203',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C14250',
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C7057',  // Disorder
    'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C1908',
    'http://purl.bioontology.org/NEMO/ontology/NEMO.owl#NEMO_0000001',
    'http://purl.bioontology.org/ontology/MCCL/CL_0000144',
    'http://purl.jp/bio/01/mccv#MCCV_000039',
    'http://purl.jp/bio/11/csso/CSSO_000010',
    'http://purl.obolibrary.org/obo/APO_0000001',
    'http://purl.obolibrary.org/obo/APO_0000006',
    'http://purl.obolibrary.org/obo/APO_0000017',
    'http://purl.obolibrary.org/obo/APO_0000018',
    // 'http://purl.obolibrary.org/obo/NCBITaxon_131567',  // cellular organism
    // 'http://purl.obolibrary.org/obo/BFO_0000002',
    // 'http://purl.obolibrary.org/obo/BFO_0000015',
    // 'http://purl.obolibrary.org/obo/BFO_0000040',
    'http://purl.obolibrary.org/obo/BTO_0000007',
    'http://purl.obolibrary.org/obo/BTO_0000018',
    'http://purl.obolibrary.org/obo/BTO_0000035',
    'http://purl.obolibrary.org/obo/BTO_0000089',
    'http://purl.obolibrary.org/obo/BTO_0000093',
    'http://purl.obolibrary.org/obo/BTO_0000119',
    'http://purl.obolibrary.org/obo/BTO_0000131',
    'http://purl.obolibrary.org/obo/BTO_0000133',
    'http://purl.obolibrary.org/obo/BTO_0000142',
    'http://purl.obolibrary.org/obo/BTO_0000149',
    'http://purl.obolibrary.org/obo/BTO_0000150',
    'http://purl.obolibrary.org/obo/BTO_0000155',
    'http://purl.obolibrary.org/obo/BTO_0000163',
    'http://purl.obolibrary.org/obo/BTO_0000165',
    'http://purl.obolibrary.org/obo/BTO_0000208',
    'http://purl.obolibrary.org/obo/BTO_0000214',
    'http://purl.obolibrary.org/obo/BTO_0000300',
    'http://purl.obolibrary.org/obo/BTO_0000316',
    'http://purl.obolibrary.org/obo/BTO_0000343',
    'http://purl.obolibrary.org/obo/BTO_0000345',
    'http://purl.obolibrary.org/obo/BTO_0000357',
    'http://purl.obolibrary.org/obo/BTO_0000424',
    'http://purl.obolibrary.org/obo/BTO_0000440',
    'http://purl.obolibrary.org/obo/BTO_0000448',
    'http://purl.obolibrary.org/obo/BTO_0000476',
    'http://purl.obolibrary.org/obo/BTO_0000486',
    'http://purl.obolibrary.org/obo/BTO_0000518',
    'http://purl.obolibrary.org/obo/BTO_0000552',
    'http://purl.obolibrary.org/obo/BTO_0000562',
    'http://purl.obolibrary.org/obo/BTO_0000575',
    'http://purl.obolibrary.org/obo/BTO_0000594',
    'http://purl.obolibrary.org/obo/BTO_0000599',
    'http://purl.obolibrary.org/obo/BTO_0000613',
    'http://purl.obolibrary.org/obo/BTO_0000661',
    'http://purl.obolibrary.org/obo/BTO_0000713',
    'http://purl.obolibrary.org/obo/BTO_0000722',
    'http://purl.obolibrary.org/obo/BTO_0000751',
    'http://purl.obolibrary.org/obo/BTO_0000759',
    'http://purl.obolibrary.org/obo/BTO_0000763',
    'http://purl.obolibrary.org/obo/BTO_0000772',
    'http://purl.obolibrary.org/obo/BTO_0000784',
    'http://purl.obolibrary.org/obo/BTO_0000815',
    'http://purl.obolibrary.org/obo/BTO_0000825',
    'http://purl.obolibrary.org/obo/BTO_0000862',
    'http://purl.obolibrary.org/obo/BTO_0000868',
    'http://purl.obolibrary.org/obo/BTO_0000959',
    'http://purl.obolibrary.org/obo/BTO_0001017',
    'http://purl.obolibrary.org/obo/BTO_0001025',
    'http://purl.obolibrary.org/obo/BTO_0001103',
    'http://purl.obolibrary.org/obo/BTO_0001188',
    'http://purl.obolibrary.org/obo/BTO_0001202',
    'http://purl.obolibrary.org/obo/BTO_0001226',
    'http://purl.obolibrary.org/obo/BTO_0001228',
    'http://purl.obolibrary.org/obo/BTO_0001278',
    'http://purl.obolibrary.org/obo/BTO_0001300',
    'http://purl.obolibrary.org/obo/BTO_0001363',
    'http://purl.obolibrary.org/obo/BTO_0001370',
    'http://purl.obolibrary.org/obo/BTO_0001388',
    'http://purl.obolibrary.org/obo/BTO_0001411',
    'http://purl.obolibrary.org/obo/BTO_0001419',
    'http://purl.obolibrary.org/obo/BTO_0001461',
    'http://purl.obolibrary.org/obo/BTO_0001489',
    'http://purl.obolibrary.org/obo/BTO_0001492',
    'http://purl.obolibrary.org/obo/BTO_0001498',
    'http://purl.obolibrary.org/obo/BTO_0001630',
    'http://purl.obolibrary.org/obo/BTO_0001658',
    'http://purl.obolibrary.org/obo/BTO_0001804',
    'http://purl.obolibrary.org/obo/BTO_0002056',
    'http://purl.obolibrary.org/obo/BTO_0002244',
    'http://purl.obolibrary.org/obo/BTO_0002335',
    'http://purl.obolibrary.org/obo/BTO_0002696',
    'http://purl.obolibrary.org/obo/BTO_0003086',
    'http://purl.obolibrary.org/obo/BTO_0003292',
    'http://purl.obolibrary.org/obo/BTO_0003323',
    'http://purl.obolibrary.org/obo/BTO_0003415',
    'http://purl.obolibrary.org/obo/BTO_0003804',
    'http://purl.obolibrary.org/obo/BTO_0004209',
    'http://purl.obolibrary.org/obo/BTO_0004531',
    'http://purl.obolibrary.org/obo/CHEBI_37577',
    'http://purl.obolibrary.org/obo/CL_0000003',
    'http://purl.obolibrary.org/obo/CMO_0000000',
    'http://purl.obolibrary.org/obo/DOID_4',
    'http://purl.obolibrary.org/obo/ENVO_00002297',
    'http://purl.obolibrary.org/obo/ENVO_00010483',
    'http://purl.obolibrary.org/obo/ENVO_01000254',
    'http://purl.obolibrary.org/obo/ENVO_02500000',
    'http://purl.obolibrary.org/obo/ERO_0000007',
    'http://purl.obolibrary.org/obo/FBbt_00100313',
    'http://purl.obolibrary.org/obo/FIX_0000096',
    'http://purl.obolibrary.org/obo/FIX_0000268',
    'http://purl.obolibrary.org/obo/FYPO_0000001',
    'http://purl.obolibrary.org/obo/GO_0003674',
    // 'http://purl.obolibrary.org/obo/GO_0005575',
    'http://purl.obolibrary.org/obo/GO_0008150',
    // 'http://purl.obolibrary.org/obo/IAO_0000027',
    'http://purl.obolibrary.org/obo/IEV_0000003',
    'http://purl.obolibrary.org/obo/MA_0000003',
    'http://purl.obolibrary.org/obo/MA_0002433',
    'http://purl.obolibrary.org/obo/MA_0003001',
    'http://purl.obolibrary.org/obo/MA_0003002',
    'http://purl.obolibrary.org/obo/MI_0190',
    'http://purl.obolibrary.org/obo/MI_0313',
    'http://purl.obolibrary.org/obo/MI_0500',
    'http://purl.obolibrary.org/obo/MMO_0000000',
    'http://purl.obolibrary.org/obo/MPATH_0',
    // 'http://purl.obolibrary.org/obo/OBI_0000011',
    // 'http://purl.obolibrary.org/obo/OBI_0000070',
    'http://purl.obolibrary.org/obo/OBI_0000272',
    'http://purl.obolibrary.org/obo/OBI_0100026', // Organism
    'http://purl.obolibrary.org/obo/PATO_0001236',
    'http://purl.obolibrary.org/obo/PATO_0001241',
    'http://purl.obolibrary.org/obo/PO_0009012',
    'http://purl.obolibrary.org/obo/PO_0025131',
    'http://purl.obolibrary.org/obo/PW_0000001',
    'http://purl.obolibrary.org/obo/SBO_0000000',
    'http://purl.obolibrary.org/obo/SO_0000704',
    'http://purl.obolibrary.org/obo/TO_0000387',
    'http://purl.obolibrary.org/obo/UO_0000000',
    'http://purl.org/sig/ont/fma/fma67498',
    'http://purl.org/sig/ont/fma/fma67513',
    'http://purl.org/sig/ont/fma/fma7149',
    'http://scai.fraunhofer.de/NDDUO#Clinical',
    'http://scai.fraunhofer.de/NDDUO#disease_cause',
    'http://scai.fraunhofer.de/NDDUO#Non_clinical',
    'http://who.int/icf#ICFQualifier',
    'http://www.bioassayontology.org/bao#BAO_0002753',
    'http://www.bioassayontology.org/bao#BAO_0002928',
    'http://www.bioassayontology.org/bao#BAO_0003114',
    'http://www.biopax.org/release/biopax-level3.owl#Gene',
    'http://www.biopax.org/release/biopax-level3.owl#Interaction',
    'http://www.biopax.org/release/biopax-level3.owl#Pathway',
    'http://www.biopax.org/release/biopax-level3.owl#PhysicalEntity',
    'http://www.co-ode.org/ontologies/amino-acid/2006/05/18/amino-acid.owl#AminoAcid',
    'http://www.ebi.ac.uk/efo/EFO_0000322',
    'http://www.ebi.ac.uk/efo/EFO_0000323',
    'http://www.ebi.ac.uk/efo/EFO_0000324',
    'http://www.ebi.ac.uk/efo/EFO_0000408',
    'http://www.ebi.ac.uk/efo/EFO_0000544',
    'http://www.ebi.ac.uk/efo/EFO_0000635',
    'http://www.ebi.ac.uk/efo/EFO_0000787',
    'http://www.ebi.ac.uk/efo/EFO_0001444',
    'http://www.fao.org/aims/aos/cwr.owl#EcologicalPhenomena',
    'http://www.fao.org/aims/aos/cwr.owl#Environment',
    // 'http://www.ifomis.org/bfo/1.0/snap#Object',
    // 'http://www.ifomis.org/bfo/1.1/snap#Role',
    // 'http://www.ifomis.org/bfo/1.1/span#ProcessualEntity',
    'http://www.mygrid.org.uk/ontology/JERMOntology#Assay_type',
    'http://www.mygrid.org.uk/ontology/JERMOntology#Technology_type',
    'http://www.owl-ontologies.com/unnamed.owl#Sex',
    'http://www.owl-ontologies.com/unnamed.owl#Taxon_account_section',
    'http://purl.obolibrary.org/obo/MS_0000000'
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

  this.customTopbarButtons = [{
    label: '',
    callback: function () {
      dashboardIntroStarter.start('satori-list-graph');
    },
    iconSpan: 'fa fa-info-circle introjs-starter'
  }];
}

Object.defineProperty(
  VisWrapperCtrl.prototype,
  'active', {
    enumerable: true,
    get: function () {
      return this._active;
    },
    set: function (value) {
      var self = this;

      self._active = value;

      var triggerLoadData = function () {
        if (self.ready) {
          self.loadData();
        } else {
          setTimeout(triggerLoadData, 20);
        }
      };

      if (value) {
        triggerLoadData();
      }
    }
  }
);

Object.defineProperty(
  VisWrapperCtrl.prototype,
  'treemapIsMaximized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isMaximized;
    }
  }
);

Object.defineProperty(
  VisWrapperCtrl.prototype,
  'treemapIsMinimized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isMinimized;
    }
  }
);

Object.defineProperty(
  VisWrapperCtrl.prototype,
  'treemapIsEqualized',
  {
    get: function () {
      return this.dashboardVisWrapperResizer.isEqualized;
    }
  }
);

VisWrapperCtrl.prototype.clearQuery = function (uri) {
  this.queryTerms.remove(uri, true);
};

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

VisWrapperCtrl.prototype.toggleQuery = function (uri) {
  this.queryTerms.toggleMode(uri, true);
};

angular
  .module('refineryDashboard')
  .controller('VisWrapperCtrl', [
    '$q',
    'pubSub',
    'dashboardVisData',
    'dashboardVisQueryTerms',
    'dashboardVisWrapperResizer',
    'DashboardIntrosSatoriListGraph',
    'DashboardIntrosSatoriTreemap',
    'dashboardIntroStarter',
    'treemapContext',
    VisWrapperCtrl
  ]);
