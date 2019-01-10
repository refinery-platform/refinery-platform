import os
import logging

import boto3
import botocore

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ...models import FileStoreItem
from ...utils import S3MediaStorage, S3_WRITE_ARGS

logging.disable(logging.INFO)  # boto3 logging is verbose at DEBUG level


class Command(BaseCommand):
    help = """Move data files from EBS volume to S3 MEDIA_BUCKET and update
    corresponding FileStoreItem instances"""

    def handle(self, *args, **options):
        storage = S3MediaStorage()
        s3 = boto3.client('s3')
        for item in FileStoreItem.objects.all():
            try:
                file_name = os.path.basename(item.datafile.path)
            except NotImplementedError:
                # make sure SymlinkedFileSystemStorage is the default backend
                raise CommandError(
                    "No path available for FileStoreItem with UUID '{}'."
                    "Is default storage backend file based?".format(item.uuid)
                )
            except ValueError:  # no datafile available
                continue

            # skip files that have already been transferred to S3
            if '/' not in item.datafile.name[:7]:
                self.stdout.write("Skipping {}: already transferred".format(
                    item.datafile.name))
                continue

            # transfer the file
            key = storage.get_name(file_name)
            self.stdout.write("Moving '{}' to 's3://{}/{}'".format(
                item.datafile.path, settings.MEDIA_BUCKET, key))
            try:
                s3.upload_file(item.datafile.path, settings.MEDIA_BUCKET, key,
                               ExtraArgs=S3_WRITE_ARGS)
            except (EnvironmentError,
                    botocore.exceptions.BotoCoreError) as exc:
                raise CommandError(
                    "Error uploading from '{}' to 's3://{}/{}': {}".format(
                        item.datafile.path, settings.MEDIA_BUCKET, key, exc
                    )
                )
            try:
                os.unlink(item.datafile.path)
            except EnvironmentError as exc:
                raise CommandError("Error deleting '{}': {}".format(
                    item.datafile.path, exc))

            item.datafile.name = key
            item.save()
