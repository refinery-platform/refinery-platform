#!/bin/bash

# Creates a compress backup archive and moves it into the synced directory
#
# Author: Fritz Lekschas
# Date:   2015-09-17
#
# Call:
# ./backup.sh


# Backup Configuration
# ------------------------------------------------------------------------------
# Final backup location
BACKUP_FINAL="/vagrant/transfer"


# Do not edit the code below that line!
# ------------------------------------------------------------------------------
NOW=$(date +%Y%m%d)

BACKUP_TEMP="/tmp/backups"

REFINERY_BASE_DIR="/vagrant/refinery"
CONFIG_DIR="config"
CONFIG_FILE="config.json"
NEO4J_DATA="/var/lib/neo4j/data/graph.db/"

DEFAULT="\e[39m"
DIM="\e[2m"
GREEN="\e[92m"
RED="\e[91m"
RESET="\e[0m"
YELLOW="\e[93m"

TIME_START=$(date +"%s")

# Check if the backup directory exist and if it doesn't create it
mkdir -p "$BACKUP_TEMP/$NOW"

if [ ! -d "$BACKUP_FINAL" ]; then
  echo -e "$YELLOW\xE2\x9A\xA0 The final backup directory either doesn't exist or is not writebale! Writing to temporary backup directory only.$DEFAULT"
  BACKUP_FINAL=$BACKUP_TEMP
fi

# Backup settings
echo -e "Settings... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

mkdir -p "$BACKUP_TEMP/$NOW/settings"
cp "$REFINERY_BASE_DIR/$CONFIG_DIR/$CONFIG/$CONFIG_FILE" "$BACKUP_TEMP/$NOW/settings/$CONFIG_FILE"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "copied! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Backup PostgreSQL
echo -e "PostgreSQL db... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

mkdir -p "$BACKUP_TEMP/$NOW/postgresql"
pg_dump -Fc refinery > "$BACKUP_TEMP/$NOW/postgresql/refinery.dump"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "dumped! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Backup file store
echo -e "File store... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

mkdir -p "$BACKUP_TEMP/$NOW/file_store"
sudo rsync -az --partial "/vagrant/media/file_store/" "$BACKUP_TEMP/$NOW/file_store"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "copied! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Backup Neo4J
echo -e "Neo4J graph db... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

mkdir -p "$BACKUP_TEMP/$NOW/neo4j"
sudo service neo4j-service stop
sudo rsync -az --partial "$NEO4J_DATA" "$BACKUP_TEMP/$NOW/neo4j"
sudo service neo4j-service start > /dev/null

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "copied! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

# Compress backup and copy it to the final destination
echo -e "Compressing... \c"
TIME_INTERMEDIATE_START=$(date +"%s")

cd "$BACKUP_TEMP"
tar -czf "./$NOW.tar.gz" "./$NOW"
rm -rf "./$NOW"
mv "$BACKUP_TEMP/$NOW.tar.gz" "$BACKUP_FINAL/$NOW.tar.gz"

TIME_INTERMEDIATE_END=$(date +"%s")
TIME_INTERMEDIATE_DIFF=$(($TIME_INTERMEDIATE_END-$TIME_INTERMEDIATE_START))
echo -e "done! $DIM($(($TIME_INTERMEDIATE_DIFF / 60)) min and $(($TIME_INTERMEDIATE_DIFF % 60)) sec)$RESET"

TIME_END=$(date +"%s")
TIME_DIFF=$(($TIME_END-$TIME_START))

echo -e "$GREEN\xE2\x9C\x93 Backup complete! $DEFAULT$DIM($(($TIME_DIFF / 60)) min and $(($TIME_DIFF % 60)) sec)$RESET"
