from django.db import models

class Instance( models.Model ):
    base_url = models.CharField( max_length = 2000 )
    data_url = models.CharField( max_length = 100 )
    api_url = models.CharField( max_length = 100 )
    api_key = models.CharField( max_length = 50 )
    staging_path = models.CharField( max_length = 2000 )
    description = models.CharField( max_length = 500 )

    def __unicode__(self):
        return self.description + " (" + self.api_key + ")"



class DataFile( models.Model ):
    path = models.CharField( max_length = 2000 )
    kind = models.CharField( max_length = 20 );
    description = models.CharField( max_length = 500 )


    def __unicode__(self):
        return self.description + " (" + self.path + ", " + self.kind + ")"


