from django.conf.urls.defaults import patterns, include, url

#galaxy_connector pages
urlpatterns = patterns('galaxy_connector.views',
    url(r'^$', 'index'),
    #url(r'^(?P<api_key>[a-z0-9]+)/$', 'api'),
    #url(r'^(?P<api_key>[a-z0-9]+)/history$', 'history'),
    url(r'^libraries/$', 'libraries'),
    url(r'^histories/$', 'histories'),
    url(r'^histories/(?P<history_id>[a-z0-9]+)/$', 'history'),
    url(r'^histories/(?P<history_id>[a-z0-9]+)/contents/(?P<content_id>[a-z0-9]+)/$', 'history_content'),
    url(r'^workflows/$', 'workflows'),
    url(r'^histories/(?P<history_id>[a-z0-9]+)/state$', 'history_progress' ),
    url(r'^histories/(?P<history_id>[a-z0-9]+)/files$', 'history_file_list' ),

    url(r'^login/(\d{1})/$', 'obtain_instance'),
    url(r'^login/$', 'obtain_instance'),
    url(r'^logout/$', 'release_instance'),

    url(r'^task_progress/(?P<task_id>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'task_progress', name="task_progress" ),
    
    url(r'^workflows/(?P<workflow_id>[a-z0-9]+)/download/$', 'workflow_content'),
    url(r'^run2/$', 'run2')   
)

