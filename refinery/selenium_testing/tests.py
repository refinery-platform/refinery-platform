from django.contrib.auth.models import User
from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from pyvirtualdisplay import Display
from selenium import webdriver

from core.management.commands.create_public_group import create_public_group
from core.management.commands.create_user import init_user
from core.models import Analysis, DataSet

from factory_boy.utils import make_analyses_with_single_dataset, make_datasets
from selenium_testing.utils import (
    assert_body_text, assert_text_within_id, delete_from_ui, login,
    MAX_WAIT, wait_until_class_visible, wait_until_id_clickable,
    wait_until_id_visible
)


class SeleniumTestBase(StaticLiveServerTestCase):
    """Abstract base class to be used for all Selenium-based tests."""

    # Don't delete data migration data after test runs: http://bit.ly/2lAYqVJ
    serialized_rollback = True

    def setUp(self, site_login=True, initialize_guest=True,
              public_group_needed=True):

        # Start a pyvirtualdisplay for geckodriver to interact with
        self.display = Display(visible=0, size=(1366, 768))
        self.display.start()
        self.browser = webdriver.Firefox()
        self.browser.maximize_window()

        if initialize_guest:
            init_user("guest", "guest", "guest@coffee.com", "Guest", "Guest",
                      "Test User", is_active=True)
            self.user = User.objects.get(username="guest")

        if site_login:
            login(self.browser, self.live_server_url)

        if public_group_needed:
            create_public_group()

    def tearDown(self):
        self.browser.quit()
        self.display.stop()

    class Meta:
        abstract = True


class NoLoginTestCase(SeleniumTestBase):
    """
    Ensure that Refinery looks like it should when there is no currently
    logged in user
    """

    # SeleniumTestBase.setUp(): We don't need to login or initialize the
    # guest user this time
    def setUp(self, site_login=True, initialize_guest=True,
              public_group_needed=False):
        super(NoLoginTestCase, self).setUp(initialize_guest=False,
                                           site_login=False)

    def test_login_not_required(self):
        self.browser.get(self.live_server_url)
        assert_body_text(
            self.browser,
            search_array=['Collaboration', 'Statistics', 'About',
                          'Register', 'Login', 'Launch Pad', 'Data Sets',
                          'Analyses', 'Workflows'])

        self.browser.find_element_by_link_text('Statistics').click()
        assert_body_text(
            self.browser,
            search_array=[
                'Users',
                'Groups',
                'Files',
                'Data Sets',
                'Workflows',
                'Projects'
            ]
        )

        self.browser.find_element_by_link_text('About').click()
        assert_body_text(self.browser,
                         search_array=['Background', 'Contact', 'Funding',
                                       'Team',
                                       'Most Recent Code for this Instance'])
        # TODO: All sections are empty right now


class DataSetsPanelTestCase(SeleniumTestBase):
    """
    Ensure that the DataSet upload button and DataSet Preview look like
    they're behaving normally
    """

    def test_data_set_preview(self):
        """Test DataSet Preview"""

        # Create sample Data & refresh page
        make_analyses_with_single_dataset(5, self.user)

        wait_until_class_visible(self.browser, "title", MAX_WAIT)
        self.browser.find_elements_by_class_name("title")[0].click()

        search_array = ["SUMMARY", "Description",
                        "Number of files (total file size)", "Owner",
                        "ANALYSES", "REFERENCES", "PROTOCOLS",
                        ]
        for item in Analysis.objects.filter(name__startswith="Test Analysis"):
            search_array.append(item.name)

        assert_body_text(self.browser, search_array)

    def test_upload_button(self):
        """Test Upload button"""

        wait_until_id_clickable(self.browser, "import-button",
                                MAX_WAIT).click()
        assert_body_text(
            self.browser,
            search_array=[
                "Data Set Import",
                "Tabular Metadata",
                "ISA-Tab Metadata",
                "PROVIDE METADATA FILE",
                "Download an example tabular metadata file.",
                "Must contain column headers in the first row of the table"]
        )


class UiDeletionTestCase(SeleniumTestBase):
    """Ensure proper deletion of DataSets and Analyses from the UI"""

    def test_dataset_deletion(self, total_datasets=2):
        """Delete some datasets and make sure the UI updates properly"""

        # Create sample Data & refresh page
        make_datasets(total_datasets, self.user)
        wait_until_id_visible(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(total_datasets)
        )

        delete_from_ui(self.browser, "dataset", total_datasets)

    def test_analysis_deletion(self, total_analyses=2):
        """Delete some analyses and make sure the UI updates properly"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)

        wait_until_id_visible(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(self.browser, "total-datasets", MAX_WAIT,
                              "{} data sets".format(1))
        assert_text_within_id(self.browser, "total-analyses",
                              "{} analyses".format(total_analyses))

        delete_from_ui(self.browser, "analysis", total_analyses)

    def test_cascading_deletion_of_analyses(self, total_analyses=5):
        """Delete a Dataset and make sure its Analyses are removed from
        the UI as well"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)

        wait_until_id_clickable(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analyses".format(
                total_analyses))

        self.browser.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'dataset-delete-button', MAX_WAIT).click()

        # Make sure that there are no more Analyses left after the One
        # Dataset is deleted
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(
            self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(0))

    def test_that_dataset_404s_are_handled(self, total_analyses=5):
        """Test use case where DataSet objects are deleted (for example by an
        admin, or a user inbetween multiple windows) while a user is about to
        delete said object(s) themselves, User should receive a "Not Found"
        message"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)

        wait_until_id_clickable(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analyses".format(
                total_analyses))

        # Simulate scenario where objects have been deleted on the backend
        DataSet.objects.all().delete()

        self.browser.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'dataset-delete-button', MAX_WAIT).click()

        wait_until_id_clickable(
            self.browser, "deletion-message-text", MAX_WAIT)
        assert_text_within_id(
            self.browser, "deletion-message-text", MAX_WAIT, "not found.")
        wait_until_id_clickable(
            self.browser, 'dataset-delete-close-button', 5).click()

        # Ensure that ui displays proper info
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(0))

    def test_that_analysis_404s_are_handled(self, total_analyses=5):
        """Test use case where Analysis objects are deleted (for example by an
        admin, or a user inbetween multiple windows) while a user is about to
        delete said object(s) themselves, User should receive a "Not Found"
        message"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)

        wait_until_id_clickable(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analyses".format(
                total_analyses))

        # Simulate scenario where objects have been deleted on the backend
        Analysis.objects.all().delete()

        self.browser.find_elements_by_class_name('analysis-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'analysis-delete-button', MAX_WAIT).click()

        wait_until_id_clickable(
            self.browser, "deletion-message-text", MAX_WAIT)
        assert_text_within_id(
            self.browser, "deletion-message-text", MAX_WAIT, "not found.")
        wait_until_id_clickable(
            self.browser, 'analysis-delete-close-button', 5).click()

        # Ensure that ui displays proper info
        wait_until_id_clickable(self.browser, "total-analyses", MAX_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", MAX_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(self.browser, "total-datasets", MAX_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            MAX_WAIT,
            "{} data sets".format(1))
