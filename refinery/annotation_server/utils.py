from .models import GenomeBuild

SUPPORTED_GENOMES = [
    genome.name for genome in GenomeBuild.objects.filter(default_build=True)
    ]
EXTENDED_GENES = {'hg19': '_GenCode', 'dm3': '_FlyBase', 'ce10': '_WormBase'}
GAP_REGIONS = ['hg19', 'dm3']
MAPPABILITY_THEORETICAL = ['hg19']
