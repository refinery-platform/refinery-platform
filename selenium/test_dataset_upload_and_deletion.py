import os
import yaml
import time
import pytest

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')

creds = yaml.load(open(os.environ['CREDS_YML']))


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
    login(selenium)

    assert_text_within_id(selenium, "launchpadStep0", "Selenium Test DataSet1")
    assert_text_within_id(selenium, "launchpadStep0", "Selenium Test DataSet2")
    assert_text_within_id(selenium, "total-datasets", "2 data sets")

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    wait_until_id_clickable(selenium, 'dataset-delete-button', 3).click()

    wait_until_id_clickable(selenium, 'dataset-delete-close-button', 3).click()

    assert_text_within_id(selenium, "launchpadStep0", "Selenium Test DataSet2")

    assert_text_within_id(selenium, "total-datasets", "1 data sets")

    time.sleep(2)

    selenium.find_elements_by_class_name('dataset-delete')[0].click()

    wait_until_id_clickable(selenium, 'dataset-delete-button', 3).click()

    wait_until_id_clickable(selenium, 'dataset-delete-close-button', 3).click()

    time.sleep(2)

    assert_text_within_id(
        selenium, "launchpadStep0", "Info No data sets available.")

    if not_travis:
        pytest.set_trace()
