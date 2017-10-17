describe('Visualization', function() {
  it('Works', function() {
    var slug = Date.now();
    cy.django_shell(
      'from factory_boy.utils import create_dataset_with_necessary_models; ' +
      'from django.contrib.auth.models import User; ' +
      'create_dataset_with_necessary_models(user=User.objects.get(username="guest"), slug="'+slug+'")'
    );
    cy.login_guest('/data_sets/'+slug);

    cy.visible_btn('Show Tool Panel').click();

  });
});
