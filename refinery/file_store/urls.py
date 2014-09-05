from django.conf.urls.defaults import patterns, url
from django.contrib.auth.decorators import login_required

# from resumable.views import ResumableUploadView
from file_store.views import MyResumableUploadView


urlpatterns = patterns('file_store.views',
    url('^upload/$', login_required(MyResumableUploadView.as_view()),
        name='upload'),
)
