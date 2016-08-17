 #!/bin/bash
set -o errexit
set -o nounset

die() { echo "$@" 1>&2; exit 1; }
warn() { echo "$@" 1>&2; }

download_and_unzip() {
  # $1 will include one parent directory.
  BASE=`basename $1`
  if [ -e $BASE.gz ] || [ -e $BASE ]
    then warn "$BASE.gz or $BASE already exists: skip download"
    else ftp ftp://hgdownload.cse.ucsc.edu/goldenPath/$GENOME/$1.gz || warn "$1.gz not available" 
  fi

  if [ -e $BASE.gz ]; then
    if [ -e $BASE ]
      then warn "$BASE already exists: skip unzip"
      else gunzip $BASE.gz
    fi
  fi
}

which faidx > /dev/null || die 'Install faidx:
- "pip install pyfaidx" makes "faidx" available on command line.
- or:
  - download from http://www.htslib.org/download/
  - make and install
  - make alias for "samtools faidx"'

which aws > /dev/null || die 'Install aws-cli'

aws s3 ls > /dev/null || die 'Check aws-cli credentials'

mkdir -p /tmp/genomes

for GENOME in $@; do
  echo "Starting $GENOME..."
  cd /tmp/genomes
  mkdir -p $GENOME  
  cd $GENOME
  download_and_unzip bigZips/upstream1000.fa # TODO: $GENOME.fa
  download_and_unzip database/cytoBand.txt 
done

echo 'Delete the cache to free up some disk.'
du -h /tmp/genomes
