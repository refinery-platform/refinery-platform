import time

import os
import sys
import pytest
import yaml

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

sys.path.append("../refinery/")

from django.contrib.auth.models import User
from factory_boy.dataset_factory import make_datasets

global TOTAL_DATASETS

# Total number of Datasets to create for the test run
TOTAL_DATASETS = 2

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


def assert_body_text(selenium, *search_texts):
    for search_text in search_texts:
        try:
            WebDriverWait(selenium, 5).until(
                EC.text_to_be_present_in_element(
                    (By.TAG_NAME, 'body'), search_text)
            )
        except TimeoutException:
            raise AssertionError(
                '"%s" not in body: \n%s' % (
                    search_text,
                    selenium.find_element_by_tag_name('body').text
                ))


def assert_text_within_id(selenium, search_id, *search_texts):
    for search_text in search_texts:
        try:
            WebDriverWait(selenium, 5).until(
                EC.text_to_be_present_in_element(
                    (By.ID, search_id), search_text)
            )
        except TimeoutException:
            raise AssertionError(
                '"%s" not in %s: \n%s' % (
                    search_text,
                    search_id,
                    selenium.find_element_by_id(search_id).text
                ))


def wait_until_id_clickable(selenium, search_id, wait_duration):
    return WebDriverWait(selenium, wait_duration).until(
        EC.element_to_be_clickable((By.ID, search_id)))


# TESTS:
def test_dataset_deletion(selenium):
    global TOTAL_DATASETS

    # Create sample Data
    make_datasets(TOTAL_DATASETS, user)

    time.sleep(2)

    login(selenium)

    assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(TOTAL_DATASETS)
    )

    while TOTAL_DATASETS:
        selenium.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(selenium, 'dataset-delete-button', 3).click()

        TOTAL_DATASETS -= 1

        wait_until_id_clickable(
            selenium, 'dataset-delete-close-button', 3).click()

        assert_text_within_id(
            selenium, "total-datasets", "{} data sets".format(TOTAL_DATASETS)
        )

    assert_text_within_id(
        selenium, "total-datasets", "{} data sets".format(TOTAL_DATASETS))

    if not_travis:
        pytest.set_trace()
