'''
Created on Sep 24, 2012

@author: nils
'''


# TODO: load list of taxa and alternative names and map based on that
# information
def map_species_name_to_id(name):
    if name.lower() == "h. sapiens":
        return 9606
    if name.lower() == "c. elegans":
        return 6239
    if name.lower() == "d. melanogaster":
        return 7227
    return None


# TODO: load mapping list
def map_species_id_to_default_genome_build(id):
    if id == 9606:
        return "hg19"
    if id == 6239:
        return "WS220"
    if id == 7227:
        return "dm3"
    return None
