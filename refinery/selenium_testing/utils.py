from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as ec
from selenium.common.exceptions import TimeoutException

DEFAULT_WAIT = 5


def login(selenium, live_server_url):
    """
    Helper method to login to the StaticLiveServerTestCase Refinery instance
    :param selenium: selenium webdriver Instance
    :param live_server_url: Url of the current StaticLiveServerTestCase
    instance
    """
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
    """
    Helper method to refresh the current page
    :param selenium: selenium webdriver Instance
    """
    selenium.refresh()
    selenium.implicitly_wait(DEFAULT_WAIT)


def assert_body_text(selenium, search_array=None, *search_texts):
    """
    Ensure that some text exists within <body>
    :param selenium: selenium webdriver Instance
    :param search_array: option array of strings to ensure exist within the
    <body>
    :param search_texts: extra words to search for, provided as *args
    """
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
    """
    Ensure that some text exists within a DOM id
    :param selenium: selenium webdriver Instance
    :param search_id: DOM element id to search for
    :param wait_duration: time limit to be used in WebDriverWait()
    :param search_texts: extra words to search for, provided as *args
    """
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
    """
    Wait for a DOM element to be clickable
    :param selenium: selenium webdriver Instance
    :param search_id: DOM element id to search for
    :param wait_duration: time limit to be used in WebDriverWait()
    """
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
    """
    Wait for a DOM element to be visible
    :param selenium: selenium webdriver Instance
    :param search_id: DOM element id to search for
    :param wait_duration: time limit to be used in WebDriverWait()
    """
    try:
        return WebDriverWait(selenium, wait_duration).until(
            ec.visibility_of(selenium.find_element_by_id(search_id)))
    except TimeoutException:
            raise AssertionError(
                '"%s" not in: \n%s' % (
                    search_id,
                    selenium.find_element_by_id(search_id).text
                ))


def delete_from_ui(selenium, object_name, total_objects):
    """
    Delete some objects by interacting with Refinery's ui
    :param selenium: selenium webdriver Instance
    :param object_name: name of object to delete (dataset or analysis)
    :param total_objects: number of objects that are to be deleted
    """
    if object_name == "analysis":
        object_name_plural = "analyses"
    elif object_name == "dataset":
        object_name_plural = "datasets"

    # Delete until there are none left
    while total_objects:
        refresh(selenium)
        selenium.find_elements_by_class_name('{}-delete'.format(object_name))[
            0].click()
        selenium.implicitly_wait(DEFAULT_WAIT)
        wait_until_id_clickable(selenium,
                                '{}-delete-button'.format(object_name),
                                DEFAULT_WAIT).click()
        selenium.implicitly_wait(DEFAULT_WAIT)
        wait_until_id_clickable(selenium, '{}-delete-close-button'.format(
            object_name), DEFAULT_WAIT).click()

        total_objects -= 1

        if object_name == "analysis":

            if total_objects <= 1:
                assert_text_within_id(
                    selenium,
                    "total-{}".format(object_name_plural),
                    DEFAULT_WAIT,
                    "{} {}".format(total_objects, object_name))
            else:
                assert_text_within_id(
                    selenium,
                    "total-{}".format(object_name_plural),
                    DEFAULT_WAIT,
                    "{} {}".format(total_objects, object_name_plural)
                )
        else:
            assert_text_within_id(
                selenium,
                "total-{}".format(object_name_plural),
                DEFAULT_WAIT,
                "{} data sets".format(total_objects)
            )
