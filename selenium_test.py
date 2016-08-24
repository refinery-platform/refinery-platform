import os
import yaml
import pytest
import time

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


def upload(selenium):
    path = os.environ['UPLOAD']
    selenium.find_element_by_name('tabular_file').send_keys(path)


class TestLoginNotRequired:

    def test_home_page(self, selenium):
        selenium.get(base_url)
        assert_body_text(selenium, 'Collaboration', 'Statistics', 'About',
                         'Register', 'Login', 'Launch Pad', 'Data Sets',
                         'Analyses', 'Workflows')

    def test_statistics_page(self, selenium):
        selenium.get(base_url)
        selenium.find_element_by_link_text('Statistics').click()
        assert_body_text(selenium, 'Users', 'Groups', 'Files',
                         'Data Sets', 'Workflows', 'Projects')

    def test_about_page(self, selenium):
        selenium.get(base_url)
        selenium.find_element_by_link_text('About').click()
        assert_body_text(selenium, 'Background', 'Contact', 'Funding', 'Team',
                         'Most Recent Code for this Instance')
        # TODO: All sections are empty right now

    def test_register_page(self, selenium):
        pass  # TODO


class TestLoginRequired:

    def test_login(self, selenium, login):
        assert_body_text(selenium, 'Upload', 'Logout')

    def test_upload(self, selenium, login):
        selenium.find_element_by_link_text('Upload').click()
        time.sleep(1)  # TODO: Something better?
        upload(selenium)
