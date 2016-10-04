import os
import sys
import time
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


def test_dataset_deletion(selenium, login, total_datasets=TOTAL_DATASETS):
    """Delete some datasets and make sure the ui updates properly"""

    assert_body_text(selenium, 'Logout')

    # Create sample Data
    make_datasets(total_datasets, user)

    time.sleep(5)

    selenium.refresh()

    time.sleep(5)

    assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
    )

    while total_datasets:
        selenium.find_elements_by_class_name('dataset-delete')[0].click()

        time.sleep(5)

        wait_until_id_clickable(selenium, 'dataset-delete-button', 5).click()

        total_datasets -= 1

        wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', 5).click()

        time.sleep(5)

        assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(total_datasets)
        )

    time.sleep(5)

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(total_datasets))

    if not_travis:
        pytest.set_trace()


def test_analysis_deletion(selenium, login, total_analyses=TOTAL_ANALYSES):
    """Delete some analyses and make sure the ui updates properly"""

    assert_body_text(selenium, 'Logout')

    # Create sample Data
    make_datasets_with_analyses(total_analyses, user)
    time.sleep(5)

    selenium.refresh()

    time.sleep(5)

    assert_text_within_id(
            selenium, "total-analyses", "{} analyses".format(total_analyses)
    )

    while total_analyses:
        selenium.find_elements_by_class_name('analysis-delete')[0].click()

        time.sleep(5)

        wait_until_id_clickable(selenium, 'analysis-delete-button', 5).click()

        total_analyses -= 1

        wait_until_id_clickable(
            selenium, 'analysis-delete-close-button', 5).click()

        time.sleep(5)

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

    time.sleep(5)

    assert_text_within_id(
        selenium, "total-analyses", "{} analysis".format(total_analyses))

    if not_travis:
        pytest.set_trace()