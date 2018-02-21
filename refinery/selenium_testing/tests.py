from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType

from core.management.commands.create_public_group import create_public_group
from core.management.commands.create_user import init_user
from core.models import Analysis, DataSet
from factory_boy.utils import make_analyses_with_single_dataset, make_datasets

from .utils import (MAX_WAIT, SeleniumTestBaseGeneric, assert_text_within_id,
                    delete_from_ui, login, wait_until_id_clickable,
                    wait_until_id_visible)


class RefinerySeleniumTestBase(SeleniumTestBaseGeneric):
    """
    Base class for selenium tests specifically testing Refinery UI components
    """
    def setUp(self, site_login=True, initialize_guest=True,
              public_group_needed=True):

        # recommended solution to an auth_permission error, though doc says
        # we probably won't need to call it since django will call it
        # automatically when needed
        ContentType.objects.clear_cache()

        super(RefinerySeleniumTestBase, self).setUp()

        if initialize_guest:
            init_user("guest", "guest", "guest@coffee.com", "Guest", "Guest",
                      "Test User", is_active=True)
            self.user = User.objects.get(username="guest")

        if site_login:
            login(self.browser, self.live_server_url)

        if public_group_needed:
            create_public_group()


class UiDeletionTestCase(RefinerySeleniumTestBase):  # TODO: Replace w/ Cypress
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
