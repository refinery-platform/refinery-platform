from django.contrib import admin
from refinery_repository.models import Ontology, StudyDesignDescriptor, StudyFactor, Protocol, Investigation, Publication, Investigator, Study, StudyBracketedField, RawData, ProcessedData, Assay, AssayBracketedField


# The following classes define the admin interface for your models.
# See http://docs.djangoproject.com/en/dev/ref/contrib/admin/ for
# a full list of the options you can use in these classes.

class OntologyAdmin(admin.ModelAdmin):
    pass


class StudyDesignDescriptorAdmin(admin.ModelAdmin):
    pass


class StudyFactorAdmin(admin.ModelAdmin):
    pass


class ProtocolAdmin(admin.ModelAdmin):
    pass


class InvestigationAdmin(admin.ModelAdmin):
    pass


class PublicationAdmin(admin.ModelAdmin):
    pass


class InvestigatorAdmin(admin.ModelAdmin):
    pass


class StudyAdmin(admin.ModelAdmin):
    pass


class StudyBracketedFieldAdmin(admin.ModelAdmin):
    pass


class RawDataAdmin(admin.ModelAdmin):
    pass


class ProcessedDataAdmin(admin.ModelAdmin):
    pass


class AssayAdmin(admin.ModelAdmin):
    pass


class AssayBracketedFieldAdmin(admin.ModelAdmin):
    pass


# Each of these lines registers the admin interface for one model. If
# you don't want the admin interface for a particular model, remove
# the line which registers it.
admin.site.register(Ontology, OntologyAdmin)
admin.site.register(StudyDesignDescriptor, StudyDesignDescriptorAdmin)
admin.site.register(StudyFactor, StudyFactorAdmin)
admin.site.register(Protocol, ProtocolAdmin)
admin.site.register(Investigation, InvestigationAdmin)
admin.site.register(Publication, PublicationAdmin)
admin.site.register(Investigator, InvestigatorAdmin)
admin.site.register(Study, StudyAdmin)
admin.site.register(StudyBracketedField, StudyBracketedFieldAdmin)
admin.site.register(RawData, RawDataAdmin)
admin.site.register(ProcessedData, ProcessedDataAdmin)
admin.site.register(Assay, AssayAdmin)
admin.site.register(AssayBracketedField, AssayBracketedFieldAdmin)

