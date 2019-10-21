from django.contrib.auth.models import User
from django.test import TestCase

from analysis_manager.models import AnalysisStatus
from factory_boy.utils import make_analyses_with_single_dataset


class AnalysisManagerTestBase(TestCase):
    def setUp(self):
        self.username = 'coffee_tester'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

        analyses, self.dataset = make_analyses_with_single_dataset(
            1,
            self.user
        )

        self.analysis = analyses[0]
        self.analysis_status = AnalysisStatus.objects.get(
            analysis=self.analysis
        )
