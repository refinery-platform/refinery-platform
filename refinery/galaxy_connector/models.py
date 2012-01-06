from django.db import models

class Instance( models.Model ):
    base_url = models.CharField( max_length = 2000 )
    data_url = models.CharField( max_length = 100 );
    api_url = models.CharField( max_length = 100 )
    api_key = models.CharField( max_length = 50 )
    user_email = models.EmailField()
    user_password = models.CharField( max_length = 50 )
    description = models.CharField( max_length = 200 )

    def __unicode__(self):
        return self.user_email + " (" + self.api_key + ")"

