import os
import re
import shutil
import string
import tarfile
import tempfile
import requests

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError

from annotation_server.models import Taxon


class Command(BaseCommand):
    help = ("Either takes in a file of Taxon IDs to filter (only these taxon "
            "IDs will be included in the database) or will download all the "
            "information from NCBI and put information in the database.")

    def handle(self, *args, **options):
        taxon_file = ""  # optional file of taxon IDs that we want
        try:
            taxon_file = args[0]
        except:
            pass
        # if you passed in a file of taxon IDs for filtering, create dict
        taxon_filter = dict()
        try:
            tf = open(taxon_file, 'rb')
            for line in tf:
                taxon_filter[string.strip(line)] = 1
        except:
            print "No taxon_file"
        # setup
        temp_dir = tempfile.mkdtemp()
        taxonomy_archive = os.path.join(temp_dir, "taxdump.tar.gz")
        # grab the tarfile and extract its contents
        print "Downloading taxonomy information"
        u = requests.get(settings.TAXONOMY_URL)
        f = open(taxonomy_archive, 'wb')
        f.write(u.content)
        f.close()
        tar_file = tarfile.open(taxonomy_archive, 'r:gz')
        tar_file.extractall(temp_dir)
        # create the proper files
        names_file = os.path.join(temp_dir, "names.dmp")
        nodes_file = os.path.join(temp_dir, "nodes.dmp")
        # get a list of node IDs we're interested in (a list of the species)
        print "Getting species taxon IDs"
        species_node_ids = dict()
        f = open(nodes_file, 'rb')
        for line in f:
            if re.search(r"\sspecies", line):
                split_string = string.split(line, "|", 1)
                node_id = string.strip(split_string[0])
                if taxon_filter:
                    try:
                        taxon_filter[node_id]
                        species_node_ids[node_id] = list()
                    except KeyError:
                        pass

                else:
                    species_node_ids[node_id] = list()
        f.close()
        print "Associating species taxon IDs and names"
        # go through names file to get the names
        f = open(names_file, 'rb')
        for line in f:
            split_line = string.split(line, "|")
            split_line = [string.strip(x) for x in split_line]
            tax_id = split_line.pop(0)
            try:
                species_node_ids[tax_id].append(
                    {
                        'taxon_id': tax_id,
                        'name': split_line[0],
                        'unique_name': split_line[1],
                        'type': split_line[2]
                    }
                )
                # create an alias e.g. Homo sapiens -> H. sapiens if
                # scientific name
                if split_line[2] == 'scientific name':
                    split_name = string.split(split_line[0], " ", 1)
                    abbr_name = "%s. %s" % (split_name[0][0], split_name[1])
                    species_node_ids[tax_id].append(
                        {
                            'taxon_id': tax_id,
                            'name': abbr_name,
                            'unique_name': split_line[0],
                            'type': 'abbreviation'
                        }
                    )
            except:
                pass
        f.close()
        # cleanup
        shutil.rmtree(temp_dir)
        # import taxon_names
        for taxon_id, val_list in species_node_ids.items():
            for entry in val_list:
                taxon = Taxon(**entry)
                try:
                    taxon.save()
                    print "%s created." % taxon
                except IntegrityError:
                    transaction.rollback_unless_managed()
                    print "Duplicate Value %s" % taxon
