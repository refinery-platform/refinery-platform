from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
from selenium.common.exceptions import TimeoutException

DEFAULT_WAIT = 10


def login(selenium, live_server_url):
    selenium.get(live_server_url)
    wait_until_id_clickable(selenium, "refinery-login", DEFAULT_WAIT)
    selenium.find_element_by_link_text('Login').click()
    wait_until_id_clickable(selenium, "id_username", DEFAULT_WAIT)
    selenium.find_element_by_id('id_username').send_keys('guest')
    selenium.find_element_by_id('id_password').send_keys('guest')
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    wait_until_id_clickable(selenium, "refinery-logout", DEFAULT_WAIT)
    assert_body_text(selenium, 'Guest', 'Logout')
    selenium.refresh()
    selenium.implicitly_wait(DEFAULT_WAIT)


def refresh(selenium):
    selenium.refresh()
    selenium.implicitly_wait(DEFAULT_WAIT)


def assert_body_text(selenium, search_array=None, *search_texts):
    if search_array:
        search_texts = search_array
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
            ec.visibility_of((By.ID, search_id)[1]))
    except TimeoutException:
            raise AssertionError(
                '"%s" not in: \n%s' % (
                    search_id,
                    selenium.find_element_by_id(search_id).text
                ))
