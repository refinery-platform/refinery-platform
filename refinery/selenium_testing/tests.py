import time
from django.contrib.auth.models import User, Group
from django.db import transaction, connection
from django.test import LiveServerTestCase
from pyvirtualdisplay import Display
from selenium import webdriver

from core.management.commands.create_public_group import create_public_group
from core.management.commands.create_user import init_user
from core.models import DataSet, Project, Analysis
from core.models import Workflow
from factory_boy.utils import make_analyses_with_single_dataset, make_datasets
from file_store.models import FileStoreItem
from selenium_testing.utils import (
    assert_body_text, login, wait_until_id_clickable, DEFAULT_WAIT,
    assert_text_within_id, refresh)

# Start a pyvirtualdisplay for geckodriver to interact with
display = Display(visible=0, size=(1900, 1080))
display.start()


class NoLoginTestCase(LiveServerTestCase):

    def setUp(self):
        self.browser = webdriver.Firefox()
        self.browser.maximize_window()

    def tearDown(self):
        self.browser.quit()

    def test_login_not_required(self):
        self.browser.get(self.live_server_url)
        assert_body_text(
            self.browser, 'Collaboration', 'Statistics', 'About',
            'Register', 'Login', 'Launch Pad', 'Data Sets',
            'Analyses', 'Workflows')

        self.browser.find_element_by_link_text('Statistics').click()

        assert_body_text(
            self.browser,
            str(User.objects.count()),
            'Users',
            str(Group.objects.count()),
            'Groups',
            str(FileStoreItem.objects.count()),
            'Files',
            str(DataSet.objects.count()),
            'Data Sets',
            str(Workflow.objects.count()),
            'Workflows',
            str(Project.objects.count()),
            'Projects'
        )

        self.browser.find_element_by_link_text('About').click()
        assert_body_text(self.browser, 'Background', 'Contact', 'Funding',
                         'Team', 'Most Recent Code for this Instance')
        # TODO: All sections are empty right now


class DataSetsPanelTestCase(LiveServerTestCase):

    def setUp(self):
        create_public_group()
        self.browser = webdriver.Firefox()
        self.browser.maximize_window()
        init_user("guest", "guest", "guest@coffee.com", "Guest", "Guest",
                  "Test User", is_active=True)
        self.user = User.objects.get(username="guest")
        login(self.browser, self.live_server_url)

    def tearDown(self):
        self.user.delete()
        DataSet.objects.all().delete()
        self.browser.quit()

    def test_data_set_preview(self):
        """Test DataSet Preview"""

        # Create sample Data & refresh page
        make_analyses_with_single_dataset(5, self.user)
        refresh(self.browser)
        time.sleep(DEFAULT_WAIT)

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
                                DEFAULT_WAIT).click()
        assert_body_text(
            self.browser,
            "Data Set Import",
            "Tabular Metadata",
            "ISA-Tab Metadata",
            "PROVIDE METADATA FILE",
            "Download an example tabular metadata file.",
            "The first row needs to contain column headers."
        )


class UiDeletionTestCase(LiveServerTestCase):

    def setUp(self):
        create_public_group()
        self.browser = webdriver.Firefox()
        self.browser.maximize_window()
        init_user("guest", "guest", "guest@coffee.com", "Guest", "Guest",
                  "Test User", is_active=True)
        self.user = User.objects.get(username="guest")
        login(self.browser, self.live_server_url)

    def tearDown(self):
        self.user.delete()
        DataSet.objects.all().delete()
        self.browser.quit()

    def test_dataset_deletion(self, total_datasets=5):
        """Delete some datasets and make sure the ui updates properly"""

        # Create sample Data & refresh page
        make_datasets(total_datasets, self.user)
        transaction.commit()
        connection.close()
        refresh(self.browser)

        wait_until_id_clickable(
            self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(total_datasets)
        )

        # Delete individual Datasets until there are none left
        while total_datasets:
            self.browser.find_elements_by_class_name('dataset-delete')[
                0].click()
            self.browser.save_screenshot("dataset-deletion.png")
            wait_until_id_clickable(
                self.browser, 'dataset-delete-button', DEFAULT_WAIT).click()

            total_datasets -= 1

            self.browser.implicitly_wait(DEFAULT_WAIT)
            wait_until_id_clickable(
                self.browser, 'dataset-delete-close-button',
                DEFAULT_WAIT).click()

            assert_text_within_id(
                self.browser, "total-datasets", DEFAULT_WAIT,
                "{} data sets".format(
                    total_datasets))

        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(total_datasets)
        )

    def test_analysis_deletion(self, total_analyses=5):
        """Delete some analyses and make sure the ui updates properly"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)
        refresh(self.browser)

        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(1))
        assert_text_within_id(
            self.browser, "total-analyses", "{} analyses".format(
                total_analyses))

        while total_analyses:
            self.browser.find_elements_by_class_name('analysis-delete')[
                0].click()
            self.browser.save_screenshot("analysis-deletion.png")
            wait_until_id_clickable(
                self.browser, 'analysis-delete-button', DEFAULT_WAIT).click()

            total_analyses -= 1
            self.browser.save_screenshot("test_analysis_deletion{"
                                         "}.png".format(total_analyses))
            self.browser.implicitly_wait(DEFAULT_WAIT)
            wait_until_id_clickable(
                self.browser, 'analysis-delete-close-button',
                DEFAULT_WAIT).click()

            # Make sure the number of analyses indicator
            # displays the correct info
            wait_until_id_clickable(
                self.browser, "analyses-indicator", DEFAULT_WAIT)
            assert_text_within_id(
                self.browser, "analyses-indicator", DEFAULT_WAIT,
                str(total_analyses))

            # Handle case where the Pluralization of `analysis` done on the
            # frontend
            if total_analyses <= 1:
                assert_text_within_id(
                    self.browser, "total-analyses", DEFAULT_WAIT,
                    "{} analysis".format(
                        total_analyses)
                )
            else:
                assert_text_within_id(
                    self.browser, "total-analyses", DEFAULT_WAIT,
                    "{} analyses".format(
                        total_analyses)
                )
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analysis".format(
                total_analyses))

        self.browser.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'dataset-delete-button', DEFAULT_WAIT).click()
        wait_until_id_clickable(
            self.browser, 'dataset-delete-close-button', DEFAULT_WAIT).click()

        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(0))

    def test_cascading_deletion_of_analyses(self, total_analyses=5):
        """Delete a Dataset and make sure its Analyses are removed from
        the UI as well"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)
        refresh(self.browser)

        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analyses".format(
                total_analyses))

        self.browser.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'dataset-delete-button', DEFAULT_WAIT).click()

        # Make sure that there are no more Analyses left after the One
        # Dataset is deleted
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(
            self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(0))

    def test_that_dataset_404s_are_handled(self, total_analyses=5):
        """Test use case where DataSet objects are deleted (for example by an
        admin, or a user inbetween multiple windows) while a user is about to
        delete said object(s) themselves User should receive a "Not Found"
        message"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)
        refresh(self.browser)

        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analyses".format(
                total_analyses))

        # Simulate scenario where objects have been deleted on the backend
        DataSet.objects.all().delete()

        self.browser.find_elements_by_class_name('dataset-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'dataset-delete-button', DEFAULT_WAIT).click()

        wait_until_id_clickable(
            self.browser, "deletion-message-text", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "deletion-message-text", DEFAULT_WAIT, "not found.")
        wait_until_id_clickable(
            self.browser, 'dataset-delete-close-button', 5).click()

        # Ensure that ui displays proper info
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(0))

    def test_that_analysis_404s_are_handled(self, total_analyses=5):
        """Test use case where Analysis objects are deleted (for example by an
        admin, or a user inbetween multiple windows) while a user is about to
        delete said object(s) themselves User should receive a "Not Found"
        message"""

        # Create sample Data
        make_analyses_with_single_dataset(total_analyses, self.user)
        refresh(self.browser)

        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(1))
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analyses".format(
                total_analyses))

        # Simulate scenario where objects have been deleted on the backend
        Analysis.objects.all().delete()

        self.browser.find_elements_by_class_name('analysis-delete')[0].click()

        wait_until_id_clickable(
            self.browser, 'analysis-delete-button', DEFAULT_WAIT).click()

        wait_until_id_clickable(
            self.browser, "deletion-message-text", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "deletion-message-text", DEFAULT_WAIT, "not found.")
        wait_until_id_clickable(
            self.browser, 'analysis-delete-close-button', 5).click()

        # Ensure that ui displays proper info
        wait_until_id_clickable(self.browser, "total-analyses", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser, "total-analyses", DEFAULT_WAIT,
            "{} analysis".format(0))
        wait_until_id_clickable(self.browser, "total-datasets", DEFAULT_WAIT)
        assert_text_within_id(
            self.browser,
            "total-datasets",
            DEFAULT_WAIT,
            "{} data sets".format(1))
