import os
import pytest
import yaml

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
from selenium.common.exceptions import TimeoutException

from factory_boy.utils import factory_boy_cleanup

DEFAULT_WAIT = 3
base_url = os.environ['BASE_URL']
creds = yaml.load(open(os.environ['CREDS_YML']))


@pytest.fixture
def login(selenium):
    creds = yaml.load(open(os.environ['CREDS_YML']))
    selenium.get(base_url)
    wait_until_id_clickable(selenium, "refinery-login", DEFAULT_WAIT)
    selenium.find_element_by_link_text('Login').click()
    wait_until_id_clickable(selenium, "id_username", DEFAULT_WAIT)
    selenium.find_element_by_id('id_username').send_keys(creds['username'])
    selenium.find_element_by_id('id_password').send_keys(creds['password'])
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    wait_until_id_clickable(selenium, "refinery-logout", DEFAULT_WAIT)
    assert_body_text(selenium, 'Logout')


def assert_body_text(selenium, *search_texts):
    for search_text in search_texts:
        try:
            WebDriverWait(selenium, 10).until(
                ec.text_to_be_present_in_element(
                    (By.TAG_NAME, 'body'), search_text)
            )
        except TimeoutException:
            raise AssertionError(
                '"%s" not in body: \n%s' % (
                    search_text,
                    selenium.find_element_by_tag_name('body').text
                ))


def assert_text_within_id(selenium, search_id, wait_duration, *search_texts):
    for search_text in search_texts:
        try:
            WebDriverWait(selenium, wait_duration).until(
                ec.text_to_be_present_in_element(
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
    try:
        return WebDriverWait(selenium, wait_duration).until(
            ec.element_to_be_clickable((By.ID, search_id)))
    except TimeoutException:
            raise AssertionError(
                '"%s" not in: \n%s' % (
                    search_id,
                    selenium.find_element_by_id(search_id).text
                ))


def wait_until_id_visible(selenium, search_id, wait_duration):
    try:
        return WebDriverWait(selenium, wait_duration).until(
            ec.visibility_of((By.ID, search_id)))
    except TimeoutException:
            raise AssertionError(
                '"%s" not in: \n%s' % (
                    search_id,
                    selenium.find_element_by_id(search_id).text
                ))


def cleanup_on_error(func):
    """Decorator to be used on function calls that could potentially
    generate many exceptions across different browsers. Rather than having a
    bunch of try/catches, we can decorate a test function and have objects
    created through factory boy cleaned up upon an unexpected test failure,
    as to not interfere with other test runs.
    """
    def func_wrapper(*args, **kwargs):
        try:
            func(*args, **kwargs)
        except Exception:
            factory_boy_cleanup()

    return func_wrapper
