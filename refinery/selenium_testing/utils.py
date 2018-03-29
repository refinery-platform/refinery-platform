from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from pyvirtualdisplay import Display
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

# The maximum amount of time that we allow an ExpectedCondition to wait
# before timing out.
MAX_WAIT = 60


class SeleniumTestBaseGeneric(StaticLiveServerTestCase):
    """Base class to be used for all selenium-based tests"""

    # Don't delete data migration data after test runs:
    # https://docs.djangoproject.com/en/1.7/topics/testing/tools/#transactiontestcase
    serialized_rollback = True

    def setUp(self):
        self.display = Display(visible=0, size=(1366, 768))
        self.display.start()
        self.browser = webdriver.Firefox()

    def tearDown(self):
        # NOTE: quit() destroys ANY currently running webdriver instances.
        # This could become an issue if tests are ever run in parallel.
        self.browser.quit()
        self.display.stop()


def wait_until_class_visible(selenium, search_class, wait_duration):
    """
    Wait for a DOM element to be visible
    :param selenium: selenium webdriver Instance
    :param search_class: DOM element class to search for
    :param wait_duration: time limit to be used in WebDriverWait()
    """
    try:
        return WebDriverWait(selenium, wait_duration).until(
            ec.visibility_of_element_located((By.CLASS_NAME,
                                              search_class))
        )
    except TimeoutException:
        raise AssertionError(
            "Element with class: '{}' was not visible within the {} second "
            "wait period.".format(search_class, wait_duration))
