import logging

from django.conf import settings
from django.conf.urls import include, patterns, url
from django.conf.urls.static import static
from django.contrib import admin

from registration.backends.default.views import ActivationView
from tastypie.api import Api

from config.utils import RouterCombiner
from core.api import (AnalysisResource, DataSetResource, ExtendedGroupResource,
                      GroupManagementResource, InvitationResource,
                      NodeResource, ProjectResource, StatisticsResource,
                      UserAuthenticationResource, UserProfileResource,
                      WorkflowResource)
from core.forms import RegistrationFormWithCustomFields
from core.models import AuthenticationFormUsernameOrEmail
from core.urls import core_router
from core.views import CustomRegistrationView
from data_set_manager.api import (AssayResource, AttributeResource,
                                  InvestigationResource,
                                  ProtocolReferenceParameterResource,
                                  ProtocolReferenceResource, ProtocolResource,
                                  PublicationResource, StudyResource)
from data_set_manager.urls import data_set_manager_router
from file_store.urls import file_store_router
from tool_manager.urls import django_docker_engine_url, tool_manager_router
from user_files_manager.urls import (user_files_csv_url, user_files_router,
                                     user_files_url)

logger = logging.getLogger(__name__)

# NG: added for tastypie URL
v1_api = Api(api_name='v1')

v1_api.register(AnalysisResource())
v1_api.register(ProjectResource())
v1_api.register(StudyResource())
v1_api.register(AssayResource())
v1_api.register(DataSetResource())
v1_api.register(NodeResource())
v1_api.register(WorkflowResource())
v1_api.register(StatisticsResource())
v1_api.register(GroupManagementResource())
v1_api.register(UserAuthenticationResource())
v1_api.register(InvitationResource())
v1_api.register(InvestigationResource())
v1_api.register(ProtocolResource())
v1_api.register(ProtocolReferenceResource())
v1_api.register(ProtocolReferenceParameterResource())
v1_api.register(PublicationResource())
v1_api.register(AttributeResource())
v1_api.register(ExtendedGroupResource())
v1_api.register(UserProfileResource())


# patterns for all of the different applications
urlpatterns = patterns(
    '',
    # links in core urls
    url(r'^', include('core.urls')),
    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
    url(r'^tasks/', include('djcelery.urls')),
    url(r'^docs/', include('rest_framework_swagger.urls')),

    # NG: added to include additional views for admin
    # (this is not the recommended way but the only one I got to work)
    # url(
    #     r"^admin/core/test_workflows/$",
    #     admin.site.admin_view(import_workflows)
    # ),
    # url(r"^admin/core/test_data/$", admin.site.admin_view(admin_test_data)),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^djangular/', include('djangular.urls')),
    # Needs to be defined before all default URL patterns are included because
    # in Django the first matched URL pattern wins
    url(
        r'^accounts/login/$',
        'django.contrib.auth.views.login',
        {
            'authentication_form': AuthenticationFormUsernameOrEmail
        },
        name='login'
    ),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^accounts/profile/$',
        'core.views.user_profile',
        name='user_profile'),
    url(
        r'^accounts/profile/edit/$',
        'core.views.user_profile_edit',
        name='user_profile_edit'
    ),

    url(
        r'^accounts/register/$',
        CustomRegistrationView.as_view(
            form_class=RegistrationFormWithCustomFields),
        name='registration.views.register'
    ),

    url(
        r'^activate/(?P<activation_key>\w+)/$',
        ActivationView.as_view(),
        name='registration.views.activate'
    ),

    url(r'^accounts/', include('registration.backends.default.urls')),

    # NG: tastypie API urls
    url(r'^api/', include(v1_api.urls)),

    user_files_url,
    user_files_csv_url

    # (r'^favicon\.ico$',
    # 'django.views.generic.simple.redirect_to',
    # {'url': STATIC_URL+'images/favicon.ico'}),

) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# for "static" see
# https://docs.djangoproject.com/en/dev/howto/static-files/#serving-static-files-during-development

# for using DjDT with mod_wsgi
# https://github.com/django-debug-toolbar/django-debug-toolbar/issues/529
if settings.DEBUG:
    try:
        import debug_toolbar
    except ImportError:
        logger.info(
            "Couldn't set up DjDT for use with mod_wsgi: missing debug_toolbar"
        )
    else:
        urlpatterns += patterns(
            '', url(r'^__debug__/', include(debug_toolbar.urls)),
        )


# Django REST Framework Url Routing
# RouterCombiner.extend(<router instance>) to include DRF Routers defined in
# other apps urls.py files
router = RouterCombiner()
router.extend(core_router)
router.extend(data_set_manager_router)
router.extend(file_store_router)
router.extend(tool_manager_router)
router.extend(user_files_router)

# Wire up our DRF APIs using automatic URL routing.
urlpatterns += patterns(
    '', url(r"^api/v2/", include(router.urls)),
    django_docker_engine_url
)
