import os
import sys
import time
import yaml
import pytest

from data_set_manager.models import Investigation

sys.path.append("../refinery/")

from django.contrib.auth.models import User

from core.models import DataSet, Analysis, Workflow, Project, WorkflowEngine
from galaxy_connector.models import Instance
from factory_boy.django_model_factories import (make_datasets,
                                                make_datasets_with_analyses)
from utils.utils import (assert_text_within_id, assert_body_text,
                         wait_until_id_clickable)

# Total number of objects to create for the test run
TOTAL_DATASETS = 5
TOTAL_ANALYSES = 5

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


@pytest.fixture
def login(selenium):
    creds = yaml.load(open(os.environ['CREDS_YML']))
    selenium.get(base_url)
    selenium.find_element_by_link_text('Login').click()
    selenium.find_element_by_id('id_username').send_keys(creds['username'])
    selenium.find_element_by_id('id_password').send_keys(creds['password'])
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    assert_body_text(selenium, 'Logout')


def logout(selenium):
    selenium.find_element_by_link_text('Logout').click()


def cleanup():
    """Remove objects and Logout of Refinery"""
    DataSet.objects.all().delete()
    Analysis.objects.all().delete()
    Workflow.objects.all().delete()
    Project.objects.all().delete()
    WorkflowEngine.objects.all().delete()
    Instance.objects.all().delete()

    logout(selenium)


def test_dataset_deletion(selenium, total_datasets=TOTAL_DATASETS):
    """Delete some datasets and make sure the ui updates properly"""

    # Create sample Data
    make_datasets(total_datasets, user)

    time.sleep(2)

    login(selenium)

    assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
    )

    while total_datasets:
        selenium.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(selenium, 'dataset-delete-button', 3).click()

        total_datasets -= 1

        wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', 3).click()

        assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
        )

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(total_datasets))

    cleanup()

    if not_travis:
        pytest.set_trace()


def test_analysis_deletion(selenium, total_analyses=TOTAL_ANALYSES):
    """Delete some analyses and make sure the ui updates properly"""

    # Create sample Data
    make_datasets_with_analyses(total_analyses, user)

    time.sleep(2)

    login(selenium)

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    while total_analyses:
        selenium.find_elements_by_class_name('analysis-delete')[0].click()

        wait_until_id_clickable(selenium, 'analysis-delete-button', 3).click()

        total_analyses -= 1

        wait_until_id_clickable(
            selenium, 'analysis-delete-close-button', 3).click()

        if total_analyses == 1:
            assert_text_within_id(
                selenium, "total-analyses", "{} analysis".format(
                    total_analyses)
            )
        else:
            assert_text_within_id(
                selenium, "total-analyses", "{} analyses".format(
                    total_analyses)
            )

    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(total_analyses))

    cleanup()

    if not_travis:
        pytest.set_trace()


