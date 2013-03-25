from django.db import models

class Instance( models.Model ):
    base_url = models.CharField( max_length=2000 )
    data_url = models.CharField( max_length=100, default="datasets" )
    api_url = models.CharField( max_length=100, default="api" )
    api_key = models.CharField( max_length=50 )
    description = models.CharField( max_length=500, null=True, blank=True, default="" )
    local_download = models.BooleanField( default=False )

    def __unicode__(self):
        return self.description + " (" + self.api_key + ")"