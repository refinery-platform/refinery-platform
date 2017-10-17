describe('Satori', function() {
  it('prints "No data available"', function() {
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

  it('renders mock API response', function() {
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

    cy.visit('/');
    cy.visible('Mock data set.');
    cy.visible('Oct 16, 2017');
    cy.visible_btn('Explore').click();

    cy.visible('Native cell').click();
    cy.get('#list-graph-wrapper').visible('Lock').click();


  });
});