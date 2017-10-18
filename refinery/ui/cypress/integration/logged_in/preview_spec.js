describe('Preview', function() {
  function fixtures_and_routes() {
    cy.fixture('api-v1-data_sets.json').as('data_sets');

    cy.server();
    cy.route({
      method: 'GET',
      url: '/api/v1/data_sets/?format=json&limit=50&offset=0&order_by=-modification_date',
      response: '@data_sets'
    });
  }

  it('Works', function() {
    fixtures_and_routes();

    cy.login_guest();

    cy.visible('Target data set.').click();
  });
});