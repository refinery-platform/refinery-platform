from os import environ


def base_url():
    return environ['BASE_URL']


def test_homepage(selenium):
    selenium.get(base_url())
