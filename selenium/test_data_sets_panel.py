import os
import pytest
import sys
import yaml

from django.contrib.auth.models import User

from core.models import DataSet, Analysis
from factory_boy.utils import make_analyses_with_single_dataset
from utils.selenium_utils import (assert_body_text, cleanup_on_error, login,
                                  DEFAULT_WAIT, wait_until_id_clickable)

base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')
creds = yaml.load(open(os.environ['CREDS_YML']))

try:
    user = User.objects.get(username=creds["username"])
except (User.DoesNotExist, User.MultipleObjectsReturned) as e:
    sys.stdout.write(e)
    sys.stdout.flush()
    sys.exit(1)


@pytest.fixture
def selenium(selenium):
    selenium.maximize_window()
    return selenium


@cleanup_on_error
def test_data_set_preview(selenium):
    """Test DataSet Preview"""

    login(selenium)

    # Create sample Data & refresh page
    make_analyses_with_single_dataset(5, user)
    selenium.refresh()

    selenium.find_element_by_link_text(DataSet.objects.get(
        name__startswith="Test DataSet -").name).click()

    assert_body_text(
        selenium,
        "SUMMARY",
        "Description",
        "Technology & Sources",
        "Number of files (total file size)",
        "Owner",
        "ANALYSES",
        [a.name for a in Analysis.objects.filter(
            name__startswith="Test Analysis")],
        "REFERENCES",
        "PROTOCOLS"
    )
    selenium.find_element_by_link_text(DataSet.objects.get(
        name__startswith="Test DataSet -").name).click()


def test_upload_button(selenium):
    """Test Upload button"""

    login(selenium)

    wait_until_id_clickable(selenium, "import-button", DEFAULT_WAIT).click()
    wait_until_id_clickable(selenium, "metadata-table-form", DEFAULT_WAIT)

    assert_body_text(
        selenium,
        "Data Set Import",
        "Tabular Metadata",
        "ISA-Tab Metadata",
        "PROVIDE METADATA FILE",
        "Download an example tabular metadata file.",
        "The first row needs to contain column headers."
    )
