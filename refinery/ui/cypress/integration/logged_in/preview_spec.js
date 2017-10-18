describe('Preview', function() {

  function fixtures_and_routes() {
    cy.fixture('api-v1-data_sets.json').as('data_sets');
    cy.fixture('api-v1-data_sets-studies.json').as('data_sets_studies');
    cy.fixture('api-v1-data_sets-assays.json').as('data_sets_assays');
    cy.fixture('api-v1-data_sets-sharing.json').as('data_sets_sharing');

    cy.server();
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/?format=json&limit=50&offset=0&order_by=-modification_date',
      response: '@data_sets'
    });
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/b80f6abf-058a-4629-888f-d31375c1927e/studies/',
      response: '@data_sets_studies'
    });
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/b80f6abf-058a-4629-888f-d31375c1927e/assays/',
      response: '@data_sets_assays'
    });
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/b80f6abf-058a-4629-888f-d31375c1927e/sharing/?format=json',
      response: '@data_sets_sharing'
    })
  }

  it('Works', function() {
    fixtures_and_routes();

    cy.visit('/');
    cy.visible('Target data set.').click();

    cy.visible('Description');
    cy.visible('Technology & Measurement');
    cy.visible('Number of files (total file size)');
    cy.visible('Owner');
    cy.visible('Analyses');
    cy.visible('References');
    cy.visible('Protocols');
  });
});