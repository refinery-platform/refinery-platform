# A Brief Introduction for Data Analysts 

Refinery is a data management, analysis, and visualization platform designed to support analysts in managing common tasks in analysis and interpretation of biomedical data. 

In this tutorial you will learn how to load data into Refinery, how to analyze it using workflows, and how to view analysis results using built-in visualization tools. Additionally, this tutorial demonstrates how to work with the data repository, how to use features that are supporting reproducible research, and how to use the collaboration tools of Refinery.

__Preparation__

To follow the steps of this tutorial, you will need a data set consisting of data files and a metadata file that is referencing your files. 

## 1. Importing a Data Set 
  1. Go to https://beta.stemcellcommons.org
  2. Click the Upload button from the Data Sets panel of the Launch Pad
  3. Create and upload data set metadata
    a. If uploading ISA-Tab metadata (recommended), choose a local .zip archive or provide the URL for a remote .zip archive
    b. If uploading a local delimited text file containing metadata (see refinery-sample-metadata.tsv example for guidance), first specify        which delimiter was used and then select the file
  4. Check metadata Preview for accuracy (note: only first 5 samples are displayed)
  5. Review Configure Metadata Import and make changes as needed
  6. Click Add files … button under Upload Data Files and select data files corresponding to the metadata (note: wait for MD5                  calculations, which ensure successful data file uploads, to complete)
  7. Click Start upload to begin uploading all selected data files
  8. After all data files have uploaded, click Upload Data Set

## 2. Viewing Data Sets in the Data Set Browser

## 3. Exploring Contents of the Data Set in the File Browser
- filter data set based on facets and sort table

## 4. Launching Analyses

- select files and:
- run analyses:
  - FASTQC
  - peak calling with MACS2
- monitor analyses

> This is a comment providing background on xyz.

## 5. Viewing Analysis Results
- view FASTQC results and download FASTQC results
- launch web-based IGV on peak calling output

## 6. Reviewing Data Provenance
- view data set in provenance graph
  - point out new nodes created by the analyses: nodes representing FASTQC results and nodes representing output of the MACS2 workflow

## 7. Collaborating with other Users
- create group for collaboration
- invite other users to group
- share data set with with group

## 8. Deleting Analyses and Data Sets
- delete MACS2 analysis
- delete data set
