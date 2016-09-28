import os
import yaml
import pytest
import subprocess

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


# TESTS:
def test_dataset_deletion(selenium):
    login(selenium)

    subprocess.Popen(
        "../refinery-platform/manage.py process_isatab {} {}".format(
            creds['username'],
            "rfc-test.zip"
        )
    )
    selenium.refresh()
    assert_body_text(selenium, "Request for Comments (RFC) Test")
    selenium.find_element_by_class_name('dataset-delete-button').click()

    search_id = 'deletion-message-text'
    search_text = "DataSet: Test 1: Request for Comments  (RFC) Test - \(no " \
                  "owner assigned) - was deleted successfully!"
    try:
        WebDriverWait(selenium, 5).until(
            EC.text_to_be_present_in_element(
                (By.ID, search_id), search_text
            )
        )
    except TimeoutException:
        raise AssertionError(
            '"{}" not in {}: \n{}'.format(
                search_text,
                search_id,
                selenium.find_element_by_id(search_id).text)
        )
    else:
        selenium.find_element_by_id('dataset-delete-cancel-button').click()
        try:
            WebDriverWait(selenium, 5).until(
                EC.text_to_be_present_in_element(
                    (By.TAG_NAME, 'body'), "Request for Comments (RFC) Test"
                )
            )
        except TimeoutException:
            pass

        except Exception as e:
            raise AssertionError("Something unepected happened: {}".format(e))

    if not_travis:
        pytest.set_trace()
