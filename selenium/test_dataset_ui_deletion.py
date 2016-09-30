import os
import sys
import time
import yaml
import pytest

sys.path.append("../refinery/")

from django.contrib.auth.models import User

from factory_boy.django_model_factories import make_datasets
from utils.utils import (assert_text_within_id, assert_body_text,
                         wait_until_id_clickable)

# Total number of Datasets to create for the test run
TOTAL_DATASETS = 50

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


def test_dataset_deletion(selenium, total_datasets=TOTAL_DATASETS):

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

    if not_travis:
        pytest.set_trace()
