'''
Created on Apr 15, 2012

@author: nils
'''

from django.forms import ModelForm, Textarea, ValidationError
from django.contrib.auth.models import User
from registration.forms import RegistrationFormUniqueEmail, RegistrationFormTermsOfService
from core.models import Project, UserProfile, Workflow, DataSet

class ProjectForm(ModelForm):
    class Meta:
        model = Project
        fields = ["name", "slug", "summary", "description"]
        '''
        widgets = {
            'description': Textarea(attrs={'cols': 80, 'rows': 20}),
        }
        ''' 
        
class RegistrationFormTermsOfServiceUniqueEmail(RegistrationFormTermsOfService, RegistrationFormUniqueEmail):
    pass

class UserForm(ModelForm):
    def clean_email(self):
        if not self.instance.email == self.cleaned_data['email']:
            if User.objects.filter(email__iexact=self.cleaned_data['email']):
                raise ValidationError("This email is already in use. Please supply a different email address.")
        return self.cleaned_data['email']

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name"]

class UserProfileForm(ModelForm):
    class Meta:
        model = UserProfile
        fields = ["affiliation", "is_public"]

class WorkflowForm(ModelForm):
    class Meta:
        model = Workflow
        fields = ["name", "slug", "summary", "description"]
        
class DataSetForm(ModelForm):
    class Meta:
        model = DataSet
        fields = ["summary", "description", "slug"]