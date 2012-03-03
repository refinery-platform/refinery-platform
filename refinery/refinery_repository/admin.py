from django.contrib import admin
from refinery_repository.models import Ontology, StudyDesignDescriptor, StudyFactor, Protocol, Investigation, Publication, Investigator, SubType, Comment, Study, Characteristic, RawData, ProcessedData, Assay, FactorValue, HaveSubtype


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


class SubTypeAdmin(admin.ModelAdmin):
    pass


class CommentAdmin(admin.ModelAdmin):
    pass


class StudyAdmin(admin.ModelAdmin):
    pass


class CharacteristicAdmin(admin.ModelAdmin):
    pass


class RawDataAdmin(admin.ModelAdmin):
    pass


class ProcessedDataAdmin(admin.ModelAdmin):
    pass


class AssayAdmin(admin.ModelAdmin):
    pass


class FactorValueAdmin(admin.ModelAdmin):
    pass


class HaveSubtypeAdmin(admin.ModelAdmin):
    pass



admin.site.register(Ontology, OntologyAdmin)
admin.site.register(StudyDesignDescriptor, StudyDesignDescriptorAdmin)
admin.site.register(StudyFactor, StudyFactorAdmin)
admin.site.register(Protocol, ProtocolAdmin)
admin.site.register(Investigation, InvestigationAdmin)
admin.site.register(Publication, PublicationAdmin)
admin.site.register(Investigator, InvestigatorAdmin)
admin.site.register(SubType, SubTypeAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Study, StudyAdmin)
admin.site.register(Characteristic, CharacteristicAdmin)
admin.site.register(RawData, RawDataAdmin)
admin.site.register(ProcessedData, ProcessedDataAdmin)
admin.site.register(Assay, AssayAdmin)
admin.site.register(FactorValue, FactorValueAdmin)
admin.site.register(HaveSubtype, HaveSubtypeAdmin)

