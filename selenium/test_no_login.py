import os
import pytest
from django.contrib.auth.models import User, Group

from core.models import DataSet, Workflow, Project
from file_store.models import FileStoreItem
from utils.selenium_utils import assert_body_text

base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')


@pytest.fixture
def selenium(selenium):
    selenium.maximize_window()
    return selenium


def test_login_not_required(selenium):
    selenium.get(base_url)
    assert_body_text(
        selenium, 'Collaboration', 'Statistics', 'About',
        'Register', 'Login', 'Launch Pad', 'Data Sets',
        'Analyses', 'Workflows')

    selenium.find_element_by_link_text('Statistics').click()

    assert_body_text(
        selenium,
        str(User.objects.count()),
        'Users',
        str(Group.objects.count()),
        'Groups',
        str(FileStoreItem.objects.count()),
        'Files',
        str(DataSet.objects.count()),
        'Data Sets',
        str(Workflow.objects.count()),
        'Workflows',
        str(Project.objects.count()),
        'Projects'
    )

    selenium.find_element_by_link_text('About').click()
    assert_body_text(selenium, 'Background', 'Contact', 'Funding', 'Team',
                     'Most Recent Code for this Instance')
    # TODO: All sections are empty right now
