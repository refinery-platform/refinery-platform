from os import environ


def base_url():
    return environ['BASE_URL']


def assert_body_text(selenium, *search_texts):
    all_text = selenium.find_element_by_tag_name('body').text
    for search_text in search_texts:
        assert search_text in all_text


def test_homepage(selenium):
    selenium.get(base_url())
    assert_body_text(selenium, 'Collaboration', 'Statistics', 'About',
                     'Register', 'Login', 'Launch Pad', 'Data Sets',
                     'Analyses', 'Workflows')
