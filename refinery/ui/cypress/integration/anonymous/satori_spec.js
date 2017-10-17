describe('Satori', function() {
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

  function fixtures_and_routes() {
    cy.fixture('api-v1-data_sets.json').as('data_sets');
    cy.fixture('neo4j-annotations.json').as('annotations');

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
  }

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

    cy.get('#list-graph-wrapper').visible('Name').click();
    cy.get('#list-graph-wrapper').get('.sort-name .icon-sort-asc.visible');
    cy.get('#list-graph-wrapper').visible('Biotin').click(); // First node, alphabetically.
    cy.get('#list-graph-wrapper').visible('Lock').click();
    cy.get('.node.lock-directly').invoke('attr','transform').should('contain', ', 0)');
  });
});