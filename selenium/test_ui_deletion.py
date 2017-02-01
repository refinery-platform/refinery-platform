from __future__ import absolute_import
import os
import sys

from django.contrib.auth.models import User

import pytest
import yaml

from core.models import DataSet, Analysis
from factory_boy.django_model_factories import (
    make_datasets, make_analyses_with_single_dataset)
from utils.utils import (assert_text_within_id, wait_until_id_clickable,
                         assert_body_text)

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
    selenium.get(base_url)
    selenium.find_element_by_link_text('Login').click()
    selenium.find_element_by_id('id_username').send_keys(creds['username'])
    selenium.find_element_by_id('id_password').send_keys(creds['password'])
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    assert_body_text(selenium, 'Logout')


def test_dataset_deletion(selenium, total_datasets=TOTAL_DATASETS):
    """Delete some datasets and make sure the ui updates properly"""
    login(selenium)

    # Create sample Data
    make_datasets(total_datasets, user)

    selenium.implicitly_wait(3)
    selenium.refresh()
    selenium.implicitly_wait(3)

    assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
    )

    # Delete individual Datasets until there are none left
    while total_datasets:
        selenium.find_elements_by_class_name('dataset-delete')[0].click()

        selenium.implicitly_wait(3)

        wait_until_id_clickable(selenium, 'dataset-delete-button', 5).click()

        total_datasets -= 1

        wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', 5).click()

        selenium.implicitly_wait(3)

        assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
        )

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(total_datasets))

    if not_travis:
        pytest.set_trace()


def test_analysis_deletion(selenium, total_analyses=TOTAL_ANALYSES):
    """Delete some analyses and make sure the ui updates properly"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.implicitly_wait(3)

    selenium.refresh()

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(1))

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    while total_analyses:
        selenium.find_elements_by_class_name('analysis-delete')[0].click()

        selenium.implicitly_wait(3)

        wait_until_id_clickable(selenium, 'analysis-delete-button', 5).click()

        total_analyses -= 1

        wait_until_id_clickable(
            selenium, 'analysis-delete-close-button', 5).click()

        selenium.implicitly_wait(3)

        # Make sure the number of analyses indicator displays the correct info
        assert_text_within_id("analyses-indicator", total_analyses)

        if total_analyses <= 1:
            assert_text_within_id(
                selenium, "total-analyses", "{} analysis".format(
                    total_analyses)
            )
        else:
            assert_text_within_id(
                selenium, "total-analyses", "{} analyses".format(
                    total_analyses)
            )

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(total_analyses))

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    selenium.implicitly_wait(3)

    wait_until_id_clickable(selenium, 'dataset-delete-button', 5).click()

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


def test_cascading_deletion_of_analyses(selenium,
                                        total_analyses=TOTAL_ANALYSES):
    """Delete a Dataset and make sure its Analyses are removed from
    the UI as well"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.implicitly_wait(3)

    selenium.refresh()

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(1))

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    selenium.implicitly_wait(3)

    wait_until_id_clickable(selenium, 'dataset-delete-button', 5).click()

    wait_until_id_clickable(
        selenium, 'dataset-delete-close-button', 5).click()

    selenium.implicitly_wait(5)

    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(0))

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


def test_that_dataset_404s_are_handled(
        selenium, total_analyses=TOTAL_ANALYSES):
    """Test use case where DataSet objects are deleted (for example by an
    admin, or a user inbetween multiple windows) while a user is about to
    delete said object(s) themselves User should receive a "Not Found"
    message"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.implicitly_wait(3)

    selenium.refresh()

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(1))

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    # Simulate scenario where objects have been deleted on the backend
    DataSet.objects.all().delete()

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    selenium.implicitly_wait(3)

    wait_until_id_clickable(selenium, 'dataset-delete-button', 5).click()

    selenium.implicitly_wait(3)

    assert_text_within_id(selenium, "deletion-message-text", "not found.")

    wait_until_id_clickable(
        selenium, 'dataset-delete-close-button', 5).click()

    selenium.implicitly_wait(5)

    # Ensure that ui displays proper info after a refresh
    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(0))

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


def test_that_analysis_404s_are_handled(
        selenium, total_analyses=TOTAL_ANALYSES):
    """Test use case where Analysis objects are deleted (for example by an
    admin, or a user inbetween multiple windows) while a user is about to
    delete said object(s) themselves User should receive a "Not Found"
    message"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.implicitly_wait(3)

    selenium.refresh()

    selenium.implicitly_wait(3)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(1))

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    # Simulate scenario where objects have been deleted on the backend
    Analysis.objects.all().delete()

    selenium.find_elements_by_class_name('analysis-delete')[0].click()

    selenium.implicitly_wait(3)

    wait_until_id_clickable(selenium, 'analysis-delete-button', 5).click()

    selenium.implicitly_wait(3)

    assert_text_within_id(selenium, "deletion-message-text", "not found.")

    wait_until_id_clickable(
        selenium, 'analysis-delete-close-button', 5).click()

    selenium.implicitly_wait(5)

    # Ensure that ui displays proper info after a refresh
    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(0))

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(1))

    if not_travis:
        pytest.set_trace()
