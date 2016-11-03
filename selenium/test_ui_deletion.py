import os
import pytest
import sys
import yaml

from django.contrib.auth.models import User

from core.models import DataSet, Analysis
from factory_boy.utils import make_datasets, make_analyses_with_single_dataset
from utils.selenium_utils import (assert_text_within_id, wait_until_id_clickable,
                                  cleanup_on_error, wait_until_id_visible,
                                  DEFAULT_WAIT, login)

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
def test_dataset_deletion(selenium, total_datasets=5):
    """Delete some datasets and make sure the ui updates properly"""

    login(selenium)

    # Create sample Data & refresh page
    make_datasets(total_datasets, user)
    selenium.refresh()

    wait_until_id_visible(
        selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(
            total_datasets))

    # Delete individual Datasets until there are none left
    while total_datasets:
        selenium.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_visible(
            selenium, 'dataset-delete-button', DEFAULT_WAIT)
        wait_until_id_clickable(
            selenium, 'dataset-delete-button', DEFAULT_WAIT).click()

        total_datasets -= 1

        wait_until_id_visible(
            selenium, 'dataset-delete-close-button', DEFAULT_WAIT)
        wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', DEFAULT_WAIT).click()

        wait_until_id_visible(
            selenium, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(
                total_datasets))

    wait_until_id_visible(
        selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(
            total_datasets))

    if not_travis:
        pytest.set_trace()


@cleanup_on_error
def test_analysis_deletion(selenium, total_analyses=5):
    """Delete some analyses and make sure the ui updates properly"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.refresh()

    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(1))
    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses))

    while total_analyses:
        selenium.find_elements_by_class_name('analysis-delete')[0].click()

        wait_until_id_visible(selenium, 'analysis-delete-button', DEFAULT_WAIT)
        wait_until_id_clickable(
            selenium, 'analysis-delete-button', DEFAULT_WAIT).click()

        total_analyses -= 1

        wait_until_id_visible(
            selenium, 'analysis-delete-close-button', DEFAULT_WAIT)
        wait_until_id_clickable(
            selenium, 'analysis-delete-close-button', DEFAULT_WAIT).click()

        # Make sure the number of analyses indicator displays the correct info
        wait_until_id_visible(selenium, "analyses-indicator", DEFAULT_WAIT)
        assert_text_within_id(
            selenium, "analyses-indicator", DEFAULT_WAIT, total_analyses)

        # Handle case where the Pluralization of `analysis` done on the
        # frontend
        if total_analyses <= 1:
            assert_text_within_id(
                selenium, "total-analyses", DEFAULT_WAIT, "{} analysis".format(
                    total_analyses)
            )
        else:
            assert_text_within_id(
                selenium, "total-analyses", DEFAULT_WAIT, "{} analyses".format(
                    total_analyses)
            )
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-analyses", DEFAULT_WAIT, "{} analysis".format(
            total_analyses))

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    wait_until_id_clickable(
        selenium, 'dataset-delete-button', DEFAULT_WAIT).click()
    wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', DEFAULT_WAIT).click()

    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


@cleanup_on_error
def test_cascading_deletion_of_analyses(selenium, total_analyses=5):
    """Delete a Dataset and make sure its Analyses are removed from
    the UI as well"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.refresh()

    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(1))
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
            selenium, "total-analyses", DEFAULT_WAIT, "{} analyses".format(
                total_analyses))

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    wait_until_id_visible(
            selenium, 'dataset-delete-button', DEFAULT_WAIT)
    wait_until_id_clickable(
        selenium, 'dataset-delete-button', DEFAULT_WAIT).click()

    # Make sure that there are no more Analyses left after the One Dataset is
    # deleted
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-analyses", DEFAULT_WAIT, "{} analysis".format(0))
    wait_until_id_visible(
        selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


@cleanup_on_error
def test_that_dataset_404s_are_handled(selenium, total_analyses=5):
    """Test use case where DataSet objects are deleted (for example by an
    admin, or a user inbetween multiple windows) while a user is about to
    delete said object(s) themselves. User should receive a "Not Found"
    message"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.refresh()

    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(1))
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
            selenium, "total-analyses", DEFAULT_WAIT, "{} analyses".format(
                total_analyses))

    # Simulate scenario where objects have been deleted on the backend
    DataSet.objects.all().delete()

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    wait_until_id_clickable(
        selenium, 'dataset-delete-button', DEFAULT_WAIT).click()
    wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', DEFAULT_WAIT).click()

    wait_until_id_visible(selenium, "deletion-message-text", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "deletion-message-text", DEFAULT_WAIT, "not found.")
    wait_until_id_clickable(
        selenium, 'dataset-delete-close-button', 5).click()

    # Ensure that ui displays proper info
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-analyses", DEFAULT_WAIT, "{} analysis".format(0))
    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(0))

    if not_travis:
        pytest.set_trace()


@cleanup_on_error
def test_that_analysis_404s_are_handled(selenium, total_analyses=5):
    """Test use case where Analysis objects are deleted (for example by an
    admin, or a user inbetween multiple windows) while a user is about to
    delete said object(s) themselves User should receive a "Not Found"
    message"""

    login(selenium)

    # Create sample Data
    make_analyses_with_single_dataset(total_analyses, user)
    selenium.refresh()

    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(1))
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
            selenium, "total-analyses", DEFAULT_WAIT, "{} analyses".format(
                total_analyses))

    # Simulate scenario where objects have been deleted on the backend
    Analysis.objects.all().delete()

    selenium.find_elements_by_class_name('analysis-delete')[0].click()

    wait_until_id_visible(selenium, 'analysis-delete-button', DEFAULT_WAIT)
    wait_until_id_clickable(
        selenium, 'analysis-delete-button', DEFAULT_WAIT).click()

    wait_until_id_visible(selenium, "deletion-message-text", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "deletion-message-text", DEFAULT_WAIT, "not found.")
    wait_until_id_clickable(
        selenium, 'analysis-delete-close-button', 5).click()

    # Ensure that ui displays proper info
    wait_until_id_visible(selenium, "total-analyses", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-analyses", DEFAULT_WAIT, "{} analysis".format(0))
    wait_until_id_visible(selenium, "total-datasets", DEFAULT_WAIT)
    assert_text_within_id(
        selenium, "total-datasets", DEFAULT_WAIT, "{} data sets".format(1))

    if not_travis:
        pytest.set_trace()
