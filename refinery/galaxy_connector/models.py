from django.db import models

class Connection( models.Model ):
    api_key = models.CharField( max_length = 50 )
    url = models.CharField( max_length = 2000 )
    description = models.CharField( max_length = 200 )

    def __unicode__(self):
        return self.url + " (" + self.api_key + ")"

