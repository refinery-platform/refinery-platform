from bioblend import galaxy
from django.db import models
from galaxy_connector.connection import Connection


class Instance(models.Model):
    base_url = models.CharField(max_length=2000)
    data_url = models.CharField(max_length=100, default="datasets")
    api_url = models.CharField( max_length=100, default="api")
    api_key = models.CharField(max_length=50)
    description = models.CharField(max_length=500, null=True, blank=True,
                                    default="")
    local_download = models.BooleanField(default=False)

    def __unicode__(self):
        return self.description + " (" + self.api_key + ")"

    def galaxy_connection(self):
        return galaxy.GalaxyInstance(url=self.base_url, key=self.api_key)

    def get_galaxy_connection(self):
        # to be deprecated in favor of galaxy_connection()
        return Connection(
            self.base_url, self.data_url, self.api_url, self.api_key)
