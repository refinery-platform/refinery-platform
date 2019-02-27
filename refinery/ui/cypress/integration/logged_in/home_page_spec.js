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
    });
    cy.route({
      method: 'GET',
      url: '/api/v2/files/?filter_attribute={}&limit=100&sort=',
      response: '@user_files'
    });
    cy.route({
      method: 'GET',
      url: '/api/v2/tool_definitions/?data_set_uuid=',
      response: '@tools'
    });
  }

  beforeEach(function() {
    cy.viewport(1440, 900) //macbook 15"
    fixtures_and_routes();
    cy.login_guest();
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
    cy.visible('Features at a Glance');
  });

  it('about section is visible', function () {
    cy.visible('About');
    cy.visible('The Refinery Platform is a project of the Park Lab and Gehlenborg Lab at Harvard Medical School in collaboration with the Hide Lab at Harvard School of Public Health.');
  });

  it('data chart is visible', function () {
    cy.visible('Data Overview');
    cy.get('.ui-select-label', { timeout: 2000 }).contains('Top Five Categories');
    cy.visible('Technology'); // default value
  });

  it('tools list is visible', function () {
    cy.visible('Analysis and Visualization Tools').then( function () {
      cy.visible('IGV', { timeout: 5000 });
      cy.visible('Test workflow: 5 steps without branching', { timeout: 5000 }).click(); // redirect to workflow pg
      cy.get('h1').contains('Workflow');
    });
  });

  it('twitter feed header is visible', function () {
    cy.visible('News from');
    cy.visible('@stemcellcommons');
  });
});
