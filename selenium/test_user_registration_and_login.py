import os
import pytest
from time import time
from django.contrib.auth.models import User

from .utils import assert_body_text, wait_until_id_visible, DEFAULT_WAIT, \
    wait_until_id_clickable

base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')
time_stamp = str(time())  # Helps  prevent collisions when running locally.


@pytest.fixture
def selenium(selenium):
    selenium.maximize_window()
    return selenium


def test_user_registration(selenium):
    """
    Test registering a new Refinery user

    NOTE: this includes checks for valid form data
    """
    selenium.find_element_by_link_text('Register').click()
    assert_body_text(
        selenium, 'Sign Up', 'Register for an account',
        'Indicates a required field',
        'USERNAME', 'FIRST NAME', 'LAST NAME',
        'AFFILIATION', 'EMAIL ADDRESS',
        'PASSWORD (AGAIN)')

    selenium.find_element_by_name('username').send_keys('guest')
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    assert_body_text(
        selenium,
        'Please correct the errors below',
        'A user with that username already exists',
        'You must provide a First Name',
        'You must provide a Last Name',
        'You must provide an Affiliation',
        'This field is required')

    selenium.find_element_by_name('username').send_keys(time_stamp)
    selenium.find_element_by_name('first_name').send_keys('first')
    selenium.find_element_by_name('last_name').send_keys('last')
    selenium.find_element_by_name('affiliation').send_keys('affiliation')
    selenium.find_element_by_name('email').send_keys('%s@example.org' %
                                                     time_stamp)
    selenium.find_element_by_name('password1').send_keys('password')
    selenium.find_element_by_name('password2').send_keys('password')

    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    assert_body_text(selenium, 'Registration complete')

    try:
        registered_user = User.objects.get(first_name='first')
    except(User.DoesNotExist, User.MultipleObjectsReturned) as e:
        raise AssertionError("Error while fetching newly registered User: {"
                             "}".format(e))
    else:
        assert registered_user.is_active is False

        # Now activate said user so we can test logging in.
        registered_user.is_active = True
        registered_user.save()

    if not_travis:
        pytest.set_trace()


def test_login(selenium):
    """
    Test logging into Refinery with our newly created user as well as
    editing said User's profile
    """
    # Test login
    selenium.get(base_url)
    wait_until_id_visible(selenium, "refinery-login", DEFAULT_WAIT)
    selenium.find_element_by_link_text('Login').click()
    wait_until_id_visible(selenium, "id_username", DEFAULT_WAIT)
    selenium.find_element_by_id('id_username').send_keys(time_stamp)
    selenium.find_element_by_id('id_password').send_keys('password')
    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    wait_until_id_visible(selenium, "refinery-logout", DEFAULT_WAIT)
    assert_body_text(selenium, 'Logout')

    # Try and edit user profile
    wait_until_id_clickable(selenium, "refinery-user", DEFAULT_WAIT).click()

    wait_until_id_visible(selenium, "user-profile-name", DEFAULT_WAIT)
    assert_body_text(selenium, "Profile for {}".format(time_stamp),
                     "first", "last", "affiliation")

    wait_until_id_clickable(
        selenium, "user-profile-edit", DEFAULT_WAIT).click()
    wait_until_id_visible(selenium, "user-profile-name", DEFAULT_WAIT)
    assert_body_text(selenium, "Edit Your User Information",
                     "Profile for {}".format(time_stamp),
                     "first", "last", "affiliation")

    selenium.find_element_by_id('id_affiliation').send_keys("COFFEE")
    wait_until_id_clickable(selenium, "submit-link", DEFAULT_WAIT).click()

    wait_until_id_visible(selenium, "user-profile-name", DEFAULT_WAIT)
    assert_body_text(selenium, "Profile for {}".format(time_stamp),
                     "first", "last", "COFFEE")

    if not_travis:
        pytest.set_trace()
