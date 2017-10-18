describe.skip('Visualization', function() {
  it('Works', function() {
    // cy.django_manage('generate_tool_definitions');
    // TODO: Is this necessary? If the tool def already exists this will fail ... add "|| true"?

    var slug = Date.now();
    cy.django_shell(
      'from factory_boy.utils import create_dataset_with_necessary_models; ' +
      'from django.contrib.auth.models import User; ' +
      'create_dataset_with_necessary_models(user=User.objects.get(username="guest"), slug="'+slug+'")'
    );
    cy.login_guest('/data_sets/'+slug);

    cy.visible_btn('Show Tool Panel').click();
    cy.get('#tool-select-drop-down').click();
    // Higher level element covers the text we think we're clicking on.
    cy.visible('Test LIST Visualization HiGlass').parent().parent().click();

    // TODO: Need files to click on
    // TODO: Need to click "Launch"
    // TODO: Wait for vis to come up and make assertions on it
  });
});
