#!/bin/bash

# Restores a backup created by `./backup.sh`
#
# Author: Fritz Lekschas
# Date:   2015-09-17
#
# Call:
# ./restore.sh /vagrant/transfer/20150915.tar.gz

# Backup Configuration
# ------------------------------------------------------------------------------
BACKUP_TEMP="/tmp/backups"
BACKUP_FILE_PATH=$1

REFINERY_BASE_DIR="/vagrant/refinery"
CONFIG_DIR="config"
CONFIG_FILE="config.json"


# Do not edit the code below that line!
# ------------------------------------------------------------------------------

NOW=$(date +%Y%m%d)

BACKUP_FILE=$(basename $BACKUP_FILE_PATH)
BACKUP="${BACKUP_FILE%%.*}"

DEFAULT="\e[39m"
DIM="\e[2m"
GREEN="\e[92m"
RED="\e[91m"
RESET="\e[0m"
YELLOW="\e[93m"

TIME_START=$(date +"%s")

# Check if the backup directory exist and if it doesn't create it
mkdir -p "$BACKUP_TEMP/$NOW"

if [ ! -f "$BACKUP_FILE_PATH" ]; then
  echo -e "$RED\xE2\x9A\xA0 Backup file not found!$DEFAULT"
  exit 1
fi

# Copy backup archive into the VM
echo -e "Backup... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

cp "$BACKUP_FILE_PATH" "$BACKUP_TEMP/"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "copied into the VM! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Extract backup
echo -e "Backup copy... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

cd "$BACKUP_TEMP"
tar -zxf "$BACKUP_TEMP/$BACKUP_FILE"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "extracted! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

if [ ! -d "$BACKUP_TEMP/$BACKUP" ]; then
  echo -e "$RED\xE2\x9A\xA0 Backup is not a directory!$DEFAULT"
  exit 1
fi

# Restore settings
echo -e "Settings... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

if [ ! -f "$BACKUP_TEMP/$BACKUP/settings/$CONFIG_FILE" ]; then
  echo -e "$RED\xE2\x9A\xA0 Settings file not found!$DEFAULT"
  exit 1
fi
cp "$BACKUP_TEMP/$BACKUP/settings/$CONFIG_FILE" "$REFINERY_BASE_DIR/$CONFIG_DIR/$CONFIG/$CONFIG_FILE"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "restored! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Restore PostgreSQL
echo -e "PostgreSQL db... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

if [ ! -f "$BACKUP_TEMP/$BACKUP/postgresql/refinery.dump" ]; then
  echo -e "$RED\xE2\x9A\xA0 PostgreSQL dump not found!$DEFAULT"
  exit 1
fi
# We restore only public data (-n public) to avoid permission errors regarding
# plpgsql extension.
#
# See http://stackoverflow.com/a/11776053/981933
dropdb refinery
createdb refinery
pg_restore --schema=public --dbname=refinery "$BACKUP_TEMP/$BACKUP/postgresql/refinery.dump"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "restored! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Restore file store
echo -e "File store... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

if [ ! -d "$BACKUP_TEMP/$BACKUP/file_store/" ]; then
  echo -e "$RED\xE2\x9A\xA0 File store not found!$DEFAULT"
  exit 1
fi
mkdir -p "/vagrant/media/file_store"
rsync -az "$BACKUP_TEMP/$BACKUP/file_store/" "/vagrant/media/file_store"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "restored! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Restore Neo4J
echo -e "Neo4J graph db... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

if [ ! -d "$BACKUP_TEMP/$BACKUP/neo4j/" ]; then
  echo -e "$RED\xE2\x9A\xA0 Neo4J graph db not found!$DEFAULT"
  exit 1
fi
if [ "$(supervisorctl pid neo4j)" == "0" ] ; then
  # Neo4J is not running
  rsync -az "$BACKUP_TEMP/$BACKUP/neo4j/" "/opt/neo4j/data/graph.db"
else
  supervisorctl stop neo4j && rsync -az "$BACKUP_TEMP/$BACKUP/neo4j/" "/opt/neo4j/data/graph.db" && supervisorctl start neo4j
fi

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "restored! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

rm "$BACKUP_TEMP/$BACKUP_FILE"
rm -rf "$BACKUP_TEMP/$BACKUP"

TIME_END=$(date +"%s")
TIME_DIFF=$(($TIME_END-$TIME_START))

echo -e "$GREEN\xE2\x9C\x93 Backup completely restored! $DEFAULT$DIM($(($TIME_DIFF / 60)) min and $(($TIME_DIFF % 60)) sec)$RESET"
