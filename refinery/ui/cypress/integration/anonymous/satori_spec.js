describe('Satori', function() {
  function fixtures_and_routes() {
    cy.fixture('api-v1-data_sets.json').as('data_sets');
    cy.fixture('neo4j-annotations.json').as('annotations');
    cy.fixture('solr_co.json').as('solr_co');

    cy.server();
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/?format=json&limit=50&offset=0&order_by=-modification_date',
      response: '@data_sets'
    });
    cy.route({
      method: 'GET',
      url: '/neo4j/annotations/',
      response: '@annotations'
    });
    cy.route({
      method: 'GET',
      url: '/solr/core/select/?allIds=1&defType=edismax&f.description.hl.alternateField=description&f.title.hl.alternateField=title&f.title.hl.fragsize=0&fl=dbid,uuid,access&fq=django_ct:core.dataset&hl=true&hl.fl=title,description&hl.maxAlternateFieldLength=128&hl.simple.post=</em>&hl.simple.pre=<em>&q=co&qf=title^0.5+accession+submitter+text+description&rows=50&start=0&synonyms=false&wt=json',
      response: '@solr_co'
    })
  }

  describe('Visualization', function() {
    it('Prints "No data available" without fixtures', function() {
      cy.visit('/');
      cy.visible_btn('Explore').click();

      cy.visible('Intro Tour');
      cy.visible('Highlight:');
      cy.visible('Lock:');
      cy.visible('Query:');
      cy.visible('TREEMAP:');
      cy.visible('Depth:');

      cy.get('#list-graph-wrapper').contains('No data available!').should('visible');
      cy.get('#treemap-wrapper').contains('No data available!').should('visible');
    });

    it('Locks and roots nodes in list graph', function() {
      fixtures_and_routes();

      var target_title = 'Target data set.';
      var other_title = 'Other data set.';

      cy.visit('/');
      cy.visible(target_title);
      cy.visible(other_title);
      cy.visible('Oct 16, 2017');
      cy.visible_btn('Explore').click();

      cy.get('#list-graph-wrapper').visible('Native cell').click();
      cy.get('#list-graph-wrapper').visible('Lock').click();
      cy.get('#data-set-list .locked').visible(target_title);
      cy.get('#data-set-list :not(.locked)').visible(other_title);

      cy.get('#list-graph-wrapper').visible('Root').click();
      cy.get('#data-set-list .locked').visible(target_title);
      cy.get('#data-set-list').invisible(other_title);
    });

    it('Sorts nodes in list graph by name', function() {
      fixtures_and_routes();

      cy.visit('/');
      cy.visible_btn('Explore').click();

      cy.get('#list-graph-wrapper').visible('Name').click();
      cy.get('#list-graph-wrapper').get('.sort-name .icon-sort-desc.visible');
      cy.get('#list-graph-wrapper').visible('No annotations').click(); // Last node, alphabetically.
      cy.get('#list-graph-wrapper').visible('Lock').click();
      cy.get('.node.lock-directly').invoke('attr','transform').should('contain', ', 0)');
      // Other nodes will have non-zero vertical translations.

      cy.get('#list-graph-wrapper').visible('Name').click();
      cy.get('#list-graph-wrapper').get('.sort-name .icon-sort-asc.visible');
      cy.get('#list-graph-wrapper').visible('Biotin').click(); // First node, alphabetically.
      cy.get('#list-graph-wrapper').visible('Lock').click();
      cy.get('.node.lock-directly').invoke('attr','transform').should('contain', ', 0)');
      // ... and now this one has zero vertical translation.
    });
  });

  describe('Data sets list', function() {
    it('Solr search', function() {
      fixtures_and_routes();

      cy.visit('/');

      cy.get('#metadata-search').type('c');
      cy.visible('Too short!');
      cy.visible('Enter at least 2 characters to search.');

      cy.get('#metadata-search').type('o'); // Added to earlier input...
      cy.get('#total-datasets').visible('1');

      cy.visible('Comparison of muscle stem cell preplates and myoblasts.')
    })
  });
});