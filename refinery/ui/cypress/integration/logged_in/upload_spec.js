describe('Upload', function() {
  it('Has profile', function() {
    cy.login_guest('/data_set_manager/import/');
    cy.visible('Data Set Import');
    cy.visible('Tabular Metadata');
    cy.visible('ISA-Tab Metadata');

    // TODO: Mock upload
  });
});
