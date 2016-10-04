import os
import sys
import yaml
import pytest

sys.path.append("../refinery/")

from django.contrib.auth.models import User

from factory_boy.django_model_factories import (
    make_datasets, make_analyses_with_single_dataset)
from utils.utils import (assert_text_within_id, assert_body_text,
                         wait_until_id_clickable, login, selenium)

# Total number of objects to create for the test run
TOTAL_DATASETS = 5
TOTAL_ANALYSES = 5

not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')
creds = yaml.load(open(os.environ['CREDS_YML']))

try:
    user = User.objects.get(username=creds["username"])
except (User.DoesNotExist, User.MultipleObjectsReturned) as e:
    sys.stdout.write(e)
    sys.stdout.flush()
    sys.exit(1)


def test_dataset_deletion(selenium, login, total_datasets=TOTAL_DATASETS):
    """Delete some datasets and make sure the ui updates properly"""

    assert_body_text(selenium, 'Logout')

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


def test_analysis_deletion(selenium, login, total_analyses=TOTAL_ANALYSES):
    """Delete some analyses and make sure the ui updates properly"""

    assert_body_text(selenium, 'Logout')

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


def test_cascading_deletion_of_analyses(
        selenium, login, total_analyses=TOTAL_ANALYSES):
    """Delete a Dataset and make sure its Analyses are removed from
    the UI as well"""

    assert_body_text(selenium, 'Logout')

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
