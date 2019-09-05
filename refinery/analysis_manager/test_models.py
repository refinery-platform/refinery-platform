import uuid

from analysis_manager.models import AnalysisStatus

from tests import AnalysisManagerTestBase


# models
class AnalysisStatusTests(AnalysisManagerTestBase):
    def test_set_galaxy_history_state_with_valid_state(self):
        self.analysis_status.set_galaxy_history_state(AnalysisStatus.PROGRESS)
        self.assertEqual(
            self.analysis_status.galaxy_history_state,
            AnalysisStatus.PROGRESS
        )

    def test_set_galaxy_history_state_with_invalid_state(self):
        with self.assertRaises(ValueError) as context:
            self.analysis_status.set_galaxy_history_state("NOT A VALID STATE")
            self.assertEqual(
                context.exception.message,
                "Invalid Galaxy history state given"
            )

    def test_set_galaxy_import_state_with_valid_state(self):
        self.analysis_status.set_galaxy_import_state(AnalysisStatus.PROGRESS)
        self.assertEqual(
            self.analysis_status.galaxy_import_state,
            AnalysisStatus.PROGRESS
        )

    def test_set_galaxy_import_state_with_invalid_state(self):
        with self.assertRaises(ValueError) as context:
            self.analysis_status.set_galaxy_import_state("NOT A VALID STATE")
            self.assertEqual(
                context.exception.message,
                "Invalid Galaxy history state given"
            )

    def test_set_galaxy_import_task_group_id(self):
        test_uuid = str(uuid.uuid4())
        self.analysis_status.set_galaxy_import_task_group_id(test_uuid)
        self.assertEqual(
            self.analysis_status.galaxy_import_task_group_id,
            test_uuid
        )
