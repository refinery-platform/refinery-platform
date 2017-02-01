from __future__ import absolute_import
import os
from time import time

import pytest
import yaml

from utils.utils import assert_body_text

base_url = os.environ['BASE_URL']
not_travis = not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true')


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


def test_login_not_required(selenium):
    selenium.get(base_url)
    assert_body_text(
        selenium, 'Collaboration', 'Statistics', 'About',
        'Register', 'Login', 'Launch Pad', 'Data Sets',
        'Analyses', 'Workflows')

    selenium.find_element_by_link_text('Statistics').click()
    assert_body_text(
        selenium, 'Users', 'Groups', 'Files', 'Data Sets', 'Workflows',
        'Projects')

    selenium.find_element_by_link_text('About').click()
    assert_body_text(selenium, 'Background', 'Contact', 'Funding', 'Team',
                     'Most Recent Code for this Instance')
    # TODO: All sections are empty right now

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

    stamp = str(time())  # Helps  prevent collisions when running locally.
    selenium.find_element_by_name('username').send_keys(stamp)
    selenium.find_element_by_name('first_name').send_keys('first')
    selenium.find_element_by_name('last_name').send_keys('last')
    selenium.find_element_by_name('affiliation').send_keys('affiliation')
    selenium.find_element_by_name('email').send_keys('%s@example.org' % stamp)
    selenium.find_element_by_name('password1').send_keys('password')
    selenium.find_element_by_name('password2').send_keys('password')

    selenium.find_element_by_xpath('//input[@type="submit"]').click()
    assert_body_text(selenium, 'Registration complete')

    if not_travis:
        pytest.set_trace()


def test_upload(selenium):
    login(selenium)

    assert_body_text(selenium, 'Upload', 'Logout')

    selenium.find_element_by_link_text('Upload').click()
    assert_body_text(
        selenium, 'Data Set Import',
        'Tabular Metadata', 'ISA-Tab Metadata',
        'PROVIDE METADATA FILE',
        'Download an example', 'Choose delimiter', 'Select file')

    path = os.environ['UPLOAD']

    # TODO: File uploads did work in the old UI, but no longer.
    # Can we trigger the event Angular is looking for?

    selenium.find_element_by_name('tabular_file').send_keys(path)
    # selenium.execute_script('$("[name=tabular_file]").change()')

    # assert_body_text(selenium, 'PREVIEW (5 ROWS)')
    # expected_title = re.sub(r'\..*$', '', re.sub(r'^.*/', '', path))
    # title_el = selenium.find_element_by_name('title')
    # assert title_el.get_attribute('value') == expected_title

    if not_travis:
        pytest.set_trace()
