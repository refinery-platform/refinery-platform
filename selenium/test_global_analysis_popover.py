import os
import pytest
from django.contrib.auth.models import User

from core.models import DataSet, Analysis
from factory_boy.utils import make_analyses_with_single_dataset
from utils.selenium_utils import (assert_body_text,
                                  wait_until_id_clickable, DEFAULT_WAIT, login,
                                  cleanup_on_error)

base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')


@pytest.fixture
def selenium(selenium):
    selenium.maximize_window()
    return selenium


@cleanup_on_error
def test_global_analysis_icon(selenium):

    # Login
    login(selenium)
    selenium.refresh()

    global_analysis_icon = wait_until_id_clickable(
        selenium, "global-analysis-status", DEFAULT_WAIT)

    '''
    There is currently a known bug with marionette that doesn't allow for
    ActionChains/ mouse hovers to work properly.

    See:
    https://github.com/mozilla/geckodriver/issues/159
    https://bugzilla.mozilla.org/show_bug.cgi?id=1292178
    https://github.com/jgraham/webdriver-rust/tree/actions
    https://github.com/SeleniumHQ/selenium/issues/2285

    # Utilize ActionChain to hover over element
    hover_action = ActionChains(selenium)
    hover_action.move_to_element(global_analysis_icon)
    # Assert Tooltip text
    assert_text_within_id(
      selenium, "global-analysis-status", "View Recent Analyses")
    hover_action.click(global_analysis_icon)
    hover_action.perform()
    '''

    # Assert Popover text
    global_analysis_icon.click()
    assert_body_text(selenium, "Recent Analyses", "No analyses performed.")
    # Click outside of popover to close
    wait_until_id_clickable(selenium, "user-id", DEFAULT_WAIT).click()

    # Create some Analyses
    make_analyses_with_single_dataset(
        5, User.objects.get(first_name="Test User"))

    # Refresh page
    selenium.refresh()

    # Assert Popover text when Analyses exist
    wait_until_id_clickable(
        selenium, "global-analysis-status", DEFAULT_WAIT).click()

    # Assert newly created analyses show in popover
    assert_body_text(
        selenium,
        "Recent Analyses",
        [a.name for a in Analysis.objects.filter(
            name__startswith="Test Analysis")]
    )
    # Click outside of popover to close
    wait_until_id_clickable(selenium, "user-id", DEFAULT_WAIT).click()

    # Remove Data Created for this test
    DataSet.objects.filter(name__startswith="Test DataSet -").delete()
