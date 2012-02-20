#taken from http://www.b-list.org/weblog/2008/nov/14/management-commands/
from django.core.management.base import AppCommand

ADMIN_FILE_TEMPLATE = """from django.contrib import admin
from {{ app }} import {{ models|join:", " }}

{% for model in models %}
class {{ model }}Admin(admin.ModelAdmin):
    pass

{% endfor %}

{% for model in models %}admin.site.register({{ model }}, {{ model }}Admin)
{% endfor %}
"""


class Command(AppCommand):
    help = "Creates a basic admin.py file for the given app name(s)."

    args = "[appname ...]"

    def handle_app(self, app, **options):
        import os.path
        from django import template
        from django.db.models import get_models

        models = get_models(app)
        t = template.Template(ADMIN_FILE_TEMPLATE)
        c = template.Context({ 'app': app.__name__, 'models': [m._meta.object_name for m in models] })

        admin_filename = os.path.join(os.path.dirname(app.__file__), 'admin.py')
        admin_file = open(admin_filename, 'w')
        admin_file.write(t.render(c))
        admin_file.close()