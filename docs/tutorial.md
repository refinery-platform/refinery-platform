# A Brief Introduction for Data Analysts 

Refinery is a data management, analysis, and visualization platform designed to support analysts in managing common tasks in analysis and interpretation of biomedical data. 

In this tutorial you will learn how to load data into Refinery, how to analyze it using workflows, and how to view analysis results using built-in visualization tools. Additionally, this tutorial demonstrates how to work with the data repository, how to use features that are supporting reproducible research, and how to use the collaboration tools of Refinery.

__Preparation__

To follow the steps of this tutorial, you will need a data set consisting of data files and a metadata file that is referencing your files.

__This tutorial can be completed using the Tutorial Data Set, which consists of sample ChIP-seq data and their associated metadata file (need links). Follow all steps (except creating a metadata file as it already exists) and note the bullet points below some steps with expanded instructions specific to the Tutorial Data Set.__

## 1. Creating a Metadata File
1. Compile all the metadata to be associated with the data set and then organize these metadata into a delimited (e.g. tab-delimited) text file. Use https://beta.stemcellcommons.org/static/sample-files/refinery-sample-metadata.tsv as a template and note the required attributes (Sample Name, Data File, Organism, Cell Type, Technology). Additional attributes can be appended as needed.
  - __Tutorial Data Set: tab-delimited tutorial.tsv metadata file already created__

## 2. Importing a Data Set 
1. Go to the Stem Cell Commons Launch Pad at https://beta.stemcellcommons.org
2. Click the Upload button from the Data Sets panel of the Launch Pad
3. First choose delimiter used in the metadata file and then upload the file
  - __Tutorial Data Set: upload tab-delimited tutorial.tsv__
4. Check metadata Preview for accuracy (note: only first 5 samples are displayed)
5. Review Configure Metadata Import and make changes as needed
  - __Tutorial Data Set: no changes needed__
6. Click Add files … button under Upload Data Files and select data files corresponding to the metadata (note: wait for MD5 calculations, which ensure successful data file uploads, to complete)
  - __Tutorial Data Set: upload input.fastq and nanog.fastq data files__
7. Click Start upload to begin uploading all selected data files
8. After all data files have uploaded, click Upload Data Set

## 3. Viewing Data Sets in the Data Set Browser
1. Return to the Launch Pad and click on the newly uploaded data set (Expand data set preview). The Data Set Browser will display a summary of the data set

## 4. Exploring Contents of the Data Set in the File Browser
1. Click View content in File Browser to view the individual files belonging to the data set:
  - Files can be filtered based on attributes using the Attribute Filter in the left-hand panel
  - Files can also be sorted according to attributes (both ascending and descending) by clicking the attribute names (i.e. column headers)

## 5. Launching Analyses
1. From the File Browser, select the files that will serve as input for the desired workflow
2. Click the Analyze tab above the left-hand panel
3. Select one of the analysis workflows below using the drop-down menu in the left-hand panel
  - __FastQC__
    1. Select 'Current Selection' in Input Dataset drop-down menu in left-hand panel
    2. Click Launch Analysis
    3. Modify Analysis Name as needed in pop-up and then click Launch Analysis
    4. Review Analysis Launch Status in pop-up and click View Analysis to monitor analysis progress (this page can also be reached via the Analyses panel of the Launch Pad)
  - __TF ChIP-seq analysis using MACS2__
    - __Tutorial Dataset: select human ChIP-seq workflow (i.e. hg19 reference genome)__
4. (Input Dataset)
5. (Launch Analysis)
- run analyses:
  - FASTQC
  - peak calling with MACS2
- monitor analyses

> This is a comment providing background on xyz.

## 6. Viewing Analysis Results
- view FASTQC results and download FASTQC results
- launch web-based IGV on peak calling output

## 7. Reviewing Data Provenance
- view data set in provenance graph
  - point out new nodes created by the analyses: nodes representing FASTQC results and nodes representing output of the MACS2 workflow

## 8. Collaborating with other Users
- create group for collaboration
- invite other users to group
- share data set with with group

## 9. Deleting Analyses and Data Sets
- delete MACS2 analysis
- delete data set
