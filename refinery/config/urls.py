import logging

from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as django_auth_views

from registration.backends.default import (views as registration_views,
                                           urls as registration_urls)

from core.forms import RegistrationFormWithCustomFields
from core.models import AuthenticationFormUsernameOrEmail
from core.urls import core_api_urls
from core.utils import verify_recaptcha
from core.views import CustomRegistrationView, user_profile, user_profile_edit
from data_set_manager.urls import data_set_manager_api_urls
from file_store.urls import file_store_api_urls
from tool_manager.urls import tool_manager_api_urls
from tool_manager.views import AutoRelaunchProxy
from user_files_manager.urls import user_files_api_urls
from user_files_manager.views import user_files, user_files_csv

from . import utils

logger = logging.getLogger(__name__)

urlpatterns = [
    url(r'^admin/', include(admin.site.urls)),
    # Needs to be defined before all default URL patterns are included because
    # in Django the first matched URL pattern wins
    url(r'^accounts/login/$', django_auth_views.login,
        {'authentication_form': AuthenticationFormUsernameOrEmail},
        name='login'),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^accounts/profile/$', user_profile, name='user_profile'),
    url(r'^accounts/profile/edit/$', user_profile_edit,
        name='user_profile_edit'),
    url(r'^accounts/register/$',
        verify_recaptcha(CustomRegistrationView.as_view(
            form_class=RegistrationFormWithCustomFields
        )),
        name='registration.views.register'),
    url(r'^activate/(?P<activation_key>\w+)/$',
        registration_views.ActivationView.as_view(),
        name='registration.views.activate'),
    url(r'^accounts/', include(registration_urls)),
    url(r'^djangular/', include('djangular.urls')),

    url(r'', include('core.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
    url(r'^files/$', user_files, name='user_files'),
    url(r'^files_download$', user_files_csv, name='user_files_csv'),
    url(r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
        include(AutoRelaunchProxy().url_patterns()))
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Django REST Framework Url Routing
# RouterCombiner.extend(<router instance>) to include DRF Routers defined in
# other apps urls.py files
router = utils.RouterCombiner()
# Wire up our DRF APIs using automatic URL routing
urlpatterns += [
    url(r'^api/v2/', include(router.urls)),
    url(r'^api/v2/', include(core_api_urls + data_set_manager_api_urls +
                             file_store_api_urls + tool_manager_api_urls +
                             user_files_api_urls)),
]

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
        urlpatterns += [
            url(r'^__debug__/', include(debug_toolbar.urls)),
        ]
