from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('galaxy_connector.views',
    url(r'^$', 'index'),

    url(r'^login/(\d{1})/$', 'obtain_instance'),
    url(r'^login/$', 'obtain_instance'),
    url(r'^logout/$', 'release_instance'),

    url(r'^task_progress/(?P<task_id>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'task_progress', name="task_progress" ),
)
