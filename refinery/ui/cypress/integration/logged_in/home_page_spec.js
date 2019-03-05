describe('Registered user explores home page', function () {

  function fixtures_and_routes() {
    cy.fixture('api-v2-site_profiles.json').as('site_profiles');
    cy.fixture('api-v2-files.json').as('user_files');
    cy.fixture('api-v2-tool_definitions.json').as('tools');

    cy.server();
    cy.route({
      method: 'GET',
      url: '/api/v2/site_profiles/',
      response: '@site_profiles'
    }).as('getSiteProfile');
    cy.route({
      method: 'GET',
      url: '/api/v2/files/**',
      response: '@user_files'
    }).as('getFiles');
    cy.route({
      method: 'GET',
      url: '/api/v2/tool_definitions/**',
      response: '@tools'
    }).as('getTools');
  }

  beforeEach(function() {
    cy.login_guest();;
  });

  beforeEach(function() {
    cy.viewport(1440, 900) //macbook 15"
    fixtures_and_routes();
    cy.visit('/');
  });

  it('intro section is visible', function () {
    cy.visible('Welcome');
    cy.visible('Refinery');
    cy.visible('The Refinery Platform is a web-based data visualization and analysis system powered by an ISA-Tab-compatible data repository for public and private data sets. Analyses are implemented as Galaxy workflows and executed through the Galaxy API.');
  });

  it('register button is visible and redirects', function () {
    cy.visible_btn('Upload').click(); // redirects to registration page
    cy.visible('Tabular Metadata');
  });

  it('browse files button is visible and redirects', function () {
    cy.visible_btn('Browse Files').click(); // redirect to user-files page
    cy.visible('All Files');
  });

  it('explore data sets button is visible and redirects', function () {
    cy.visible_btn('Explore Data Sets').click();
    cy.visible('Exploration');
  });

  it('video carousel is visible', function () {
    cy.wait('@getSiteProfile');
    cy.visible('Features at a Glance');
  });

  it('about section is visible', function () {
    cy.wait('@getSiteProfile');
    cy.visible('About');
    cy.visible('The Refinery Platform is a project of the Park Lab and Gehlenborg Lab at Harvard Medical School in collaboration with the Hide Lab at Harvard School of Public Health.');
  });

  it('data chart is visible', function () {
    cy.wait('@getFiles');
    cy.visible('Data Overview');
    cy.get('.ui-select-label').contains('Top Five Categories');
    cy.visible('Technology'); // default value
  });

  it('tools list is visible', function () {
    cy.wait('@getTools');
    cy.visible('Analysis and Visualization Tools').then( function () {
      cy.visible('IGV');
      cy.visible('Test workflow: 5 steps without branching');
    });
  });

  it('twitter feed header is visible', function () {
    cy.visible('News from');
    cy.visible('@stemcellcommons');
  });
});
