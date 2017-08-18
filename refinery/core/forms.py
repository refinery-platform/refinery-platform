'''
Created on Apr 15, 2012

@author: nils
'''
from django import forms
from django.contrib.auth.models import User
from django.forms import ModelForm, ValidationError
from django.utils.translation import ugettext_lazy as _

from registration.forms import RegistrationForm, RegistrationFormUniqueEmail

from .models import Project, UserProfile, Workflow


class ProjectForm(ModelForm):
    def __init__(self, *args, **kwargs):
        super(ProjectForm, self).__init__(*args, **kwargs)
        self.fields['slug'].label = "Shortcut Name"

    class Meta:
        model = Project
        fields = ["name", "slug", "summary", "description"]


class RegistrationFormCustomFields(RegistrationForm):
    """
    Subclass of ``RegistrationForm`` which adds three custom fields required
    for User registration: first_name, last_name, and affiliation

    """
    first_name = forms.CharField(
        widget=forms.TextInput,
        error_messages={'required': _("You must provide a First Name")},
        label=_("First Name")
    )
    last_name = forms.CharField(
        widget=forms.TextInput,
        error_messages={'required': _("You must provide a Last Name")},
        label=_("Last Name")
    )
    affiliation = forms.CharField(
        widget=forms.TextInput,
        error_messages={'required': _("You must provide an Affiliation")},
        label=_("Affiliation")
    )


class RegistrationFormWithCustomFields(
    RegistrationFormUniqueEmail,
    RegistrationFormCustomFields
):
    pass


class UserForm(ModelForm):
    def clean_email(self):
        if not self.instance.email == self.cleaned_data['email']:
            if User.objects.filter(email__iexact=self.cleaned_data['email']):
                raise ValidationError(
                    "This email is already in use. "
                    "Please supply a different email address."
                )
        return self.cleaned_data['email']

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name"]


class UserProfileForm(ModelForm):
    class Meta:
        model = UserProfile
        fields = ["affiliation"]


class WorkflowForm(ModelForm):
    class Meta:
        model = Workflow
        fields = ["name", "slug", "summary", "description", "is_active"]
