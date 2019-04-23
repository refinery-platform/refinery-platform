import logging

from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin as admin_views
from django.contrib.auth import views as auth_views

from registration.backends.default.views import ActivationView

from config.utils import RouterCombiner
from core.forms import RegistrationFormWithCustomFields
from core.models import AuthenticationFormUsernameOrEmail
from core.urls import core_router
from core.utils import verify_recaptcha
from core.views import CustomRegistrationView
from data_set_manager.urls import data_set_manager_router
from file_store.urls import file_store_router
from tool_manager.urls import django_docker_engine_url, tool_manager_router
from user_files_manager.urls import (user_files_csv_url, user_files_router,
                                     user_files_url)

logger = logging.getLogger(__name__)

urlpatterns = [
    url(r'^admin/', include(admin_views.site.urls)),
    # Needs to be defined before all default URL patterns are included because
    # in Django the first matched URL pattern wins
    url(r'^accounts/login/$', auth_views.login,
        {'authentication_form': AuthenticationFormUsernameOrEmail},
        name='login'),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^accounts/profile/$', 'core.views.user_profile',
        name='user_profile'),
    url(r'^accounts/profile/edit/$', 'core.views.user_profile_edit',
        name='user_profile_edit'),
    url(r'^accounts/register/$',
        verify_recaptcha(CustomRegistrationView.as_view(
            form_class=RegistrationFormWithCustomFields
        )),
        name='registration.views.register'),
    url(r'^activate/(?P<activation_key>\w+)/$', ActivationView.as_view(),
        name='registration.views.activate'),
    url(r'^accounts/', include('registration.backends.default.urls')),
    url(r'^djangular/', include('djangular.urls')),
    url(r'^tasks/', include('djcelery.urls')),

    url(r'', include('core.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
    user_files_url,
    user_files_csv_url
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Django REST Framework Url Routing
# RouterCombiner.extend(<router instance>) to include DRF Routers defined in
# other apps urls.py files
router = RouterCombiner()
router.extend(core_router)
router.extend(data_set_manager_router)
router.extend(file_store_router)
router.extend(tool_manager_router)
router.extend(user_files_router)
# Wire up our DRF APIs using automatic URL routing
urlpatterns += [
    url(r"^api/v2/", include(router.urls)),
    django_docker_engine_url
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
