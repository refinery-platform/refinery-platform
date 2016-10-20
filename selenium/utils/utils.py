import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
from selenium.common.exceptions import TimeoutException

base_url = os.environ['BASE_URL']


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


def assert_text_within_id(selenium, search_id, *search_texts):
    for search_text in search_texts:
        try:
            WebDriverWait(selenium, 10).until(
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
