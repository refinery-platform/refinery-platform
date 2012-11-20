'''
Created on Apr 15, 2012

@author: nils
'''

from django.forms import ModelForm, Textarea
from django.contrib.auth.models import User
from registration.forms import RegistrationFormUniqueEmail, RegistrationFormTermsOfService
from core.models import Project, UserProfile

class ProjectForm(ModelForm):
    class Meta:
        model = Project
        exclude = ( "is_catch_all",)
        widgets = {
            'description': Textarea(attrs={'cols': 80, 'rows': 20}),
        }   
        
class RegistrationFormTermsOfServiceUniqueEmail(RegistrationFormTermsOfService, RegistrationFormUniqueEmail):
    pass

class UserForm(ModelForm):
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name"]

class UserProfileForm(ModelForm):
    class Meta:
        model = UserProfile
        fields = ["affiliation", "is_public"]
