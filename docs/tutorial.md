# A Brief Introduction for Data Analysts 

Refinery is a data management, analysis, and visualization platform designed to support analysts in managing common tasks in analysis and interpretation of biomedical data. 

In this tutorial you will learn how to load data into Refinery, how to analyze it using workflows, and how to view analysis results using built-in visualization tools. Additionally, this tutorial demonstrates how to work with the data repository, how to use features that are supporting reproducible research, and how to use the collaboration tools of Refinery.

__Preparation__

To follow the steps of this tutorial, you will need a data set consisting of data files and a metadata file that is referencing your files.

__This tutorial can be completed using the Tutorial Data Set, which consists of sample ChIP-seq data and their associated metadata file (need links). Follow all steps (except creating a metadata file as it already exists) and note the bullet points after some steps with expanded instructions specific to the Tutorial Data Set.__

## 1. Creating a Metadata File
1. Compile all the metadata to be associated with the data set and then organize these metadata into a delimited (e.g. tab-delimited) text file. A template metadata file can be found [here][refinery-sample-metadata.tsv] -- note the required attributes (sample name, data file, and organism). Additional attributes can be appended as needed.
  - __Tutorial Data Set: tab-delimited `tutorial.tsv` metadata file already created__

> __Column Order__: The attribute and file name columns in the metadata file can be provided in any order and the column headers can be chosen by the investigator. However, given that the data set importer (see next section below) will map column 1 to _sample name_, column 2 to _data file_, and column 3 to _organism_, it can save time during import if this information is provided in the first three columns in this order.


> __Column Names__: The column names provided in the metadata file can be freely chosen by the analyst and will be used to identify attributes throughout the Refinery application. They _must be unique_, _must not contain any special characters_, and _should be descriptive yet concise_.

## 2. Importing a Data Set 
1. Go to the Stem Cell Commons Launch Pad at https://beta.stemcellcommons.org
2. Click the Upload button from the Data Sets panel on the Launch Pad
3. First choose delimiter used in the metadata file and then upload the file
  - __Tutorial Data Set: upload tab-delimited `tutorial.tsv`__
4. Check metadata Preview for accuracy (note: only first 5 samples are displayed)
5. Review Configure Metadata Import and make changes as needed
  - __Tutorial Data Set: no changes needed__
6. Click Add files … button under Upload Data Files and select data files corresponding to the metadata (note: wait for MD5 calculations, which ensure successful data file uploads, to complete)
  - __Tutorial Data Set: upload `input.fastq` and `nanog.fastq` data files__
7. Click Start upload to begin uploading all selected data files
8. After all data files have uploaded, click Upload Data Set

## 3. Viewing Data Sets in the Data Set Browser
1. Return to the Launch Pad and click on the newly uploaded data set (Expand data set preview). The Data Set Browser will display a summary of the data set

## 4. Exploring Contents of the Data Set in the File Browser
1. Click _View Content_ in File Browser to view the individual files belonging to the data set:
  - Files can be filtered based on attributes using the Attribute Filter in the left-hand panel
  - Files can also be sorted according to attributes (both ascending and descending) by clicking the attribute names (i.e. column headers)

> __Direct Access of Dataset Content__: The file browser can be launched directly from the data set browser by clicking on the table icon to the right of the dataset name and summary. It is not required to open the preview first.

## 5. Launching Analyses
1. From the File Browser, select the files that will serve as input for the desired workflow
  - __Tutorial Data Set: follow the Launching Analyses section twice, first launching the FastQC workflow and afterwards the TF ChIP-seq analysis using MACS2: hg19 workflow (details below) -- in both instances, select both the `input.fastq` and `nanog.fastq` files during this step__
2. Click the Analyze tab above the left-hand panel
3. Select one of the analysis workflows below using the drop-down menu in the left-hand panel, follow their workflow-specific steps below, and then continue with step 4
  - __FastQC__
    1. Select 'Current Selection' in the Input Dataset drop-down menu in the left-hand panel
  - __TF ChIP-seq analysis using MACS2__
    1. In the Inputs (1-1 File Mapping) section, click New... to create a new file mapping
    2. Provide a name for the new file mapping in the pop-up
    3. Drag the leftmost icons (three horizontal bars) of the input control and experimental files onto the input_file and exp_file dropzones, respectively, to create the new file mapping
      - __Tutorial Data Set: map `input.fastq` to the input_file and `nanog.fastq` to the exp_file__
    4. Review the attribute comparison between input_file and exp_file to confirm distinct and shared attributes are correct
4. Click Launch Analysis
5. Modify Analysis Name as needed in pop-up and then click Launch Analysis
6. Review Analysis Launch Status in pop-up and click View Analysis to monitor analysis progress within the File Browser (this Analyses tab within the File Browser can also be directly accessed by clicking the analysis name from the Analyses panel on the Launch Pad)

## 6. Viewing Analysis Results
1. Upon successful completion of an analysis, click its name from the Analyses tab within the File Browser
2. Follow the steps below corresponding to which analysis workflow was run:
  - __FastQC__
    1. To view FastQC results, click the bar graph icon associated with a \#\_fastqc_results file
    2. Use the drop-down menu to view the results of the various FastQC analysis modules
  - __TF ChIP-seq analysis using MACS2__
    1. To visualize peak calling results, select files to be displayed as tracks in IGV (e.g. \#\_MACS2_bigwig and/or \#\_MACS2_bed files)
    2. Click the Visualize tab above the left-hand panel
    3. Select 'Current Selection' in the 'Select a file set' drop-down menu in the left-hand panel
    4. Choose the appropriate species in the 'Select a species' drop-down menu in the left-hand panel
      - __Tutorial Data Set: select 'H. Sapiens (hg19)'__
    5. Click 'Web-based IGV' to launch a visualization of the peak calling results
      - __Tutorial Data Set: search 'chr12:1-35,000,000' in the IGV search box (top left) to see all the peaks__
3. To download any results file, click the down-pointing arrow icon associated with that file

## 7. Reviewing Data Provenance
1. Display a data set in the File Browser (see sections 3 and 4)
2. Select 'Provenance' in the 'Display' drop-down menu located on the right-hand side of the page
3. Review the displayed nodes to track the analysis history of the data set -- each new analysis will add a new node to the provenance graph

## 8. Collaborating with other Users
- create group for collaboration
- invite other users to group
- share data set with with group

## 9. Deleting Analyses and Data Sets
1. To delete an analysis only, click the trash can icon in the Analyses panel on the Launch Pad. To delete a data set and all its associated analyses, click the trash can icon in the Data Sets panel on the Launch Pad.

[refinery-sample-metadata.tsv]: https://beta.stemcellcommons.org/static/sample-files/refinery-sample-metadata.tsv
