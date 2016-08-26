import os
import yaml
import pytest
import time
import re

base_url = os.environ['BASE_URL']


@pytest.fixture
def login(selenium):
    creds = yaml.load(open(os.environ['CREDS_YML']))
    selenium.get(base_url)
    selenium.find_element_by_link_text('Login').click()
    selenium.find_element_by_id('id_username').send_keys(creds['username'])
    selenium.find_element_by_id('id_password').send_keys(creds['password'])
    selenium.find_element_by_xpath('//input[@type="submit"]').click()


def assert_body_text(selenium, *search_texts):
    all_text = selenium.find_element_by_tag_name('body').text
    for search_text in search_texts:
        assert search_text in all_text

# TESTS:


def test_login_not_required(selenium):
    selenium.get(base_url)
    time.sleep(1)
    assert_body_text(selenium, 'Collaboration', 'Statistics', 'About',
                     'Register', 'Login', 'Launch Pad', 'Data Sets',
                     'Analyses', 'Workflows')

    selenium.find_element_by_link_text('Statistics').click()
    time.sleep(1)
    assert_body_text(selenium, 'Users', 'Groups', 'Files',
                     'Data Sets', 'Workflows', 'Projects')

    selenium.find_element_by_link_text('About').click()
    time.sleep(1)
    assert_body_text(selenium, 'Background', 'Contact', 'Funding', 'Team',
                     'Most Recent Code for this Instance')
    # TODO: All sections are empty right now
    # TODO: Registration page


def test_upload(selenium, login):
    assert_body_text(selenium, 'Upload', 'Logout')

    selenium.find_element_by_link_text('Upload').click()
    time.sleep(1)  # TODO: Something better?
    path = os.environ['UPLOAD']

    selenium.find_element_by_name('tabular_file').send_keys(path)
    expected_title = re.sub(r'\..*$', '', re.sub(r'^.*/', '', path))
    title_el = selenium.find_element_by_name('title')
    assert title_el.get_attribute('value') == expected_title
    if not('TRAVIS' in os.environ and os.environ['TRAVIS'] == 'true'):
        pytest.set_trace()  # In debug, hit "c" to continue.
