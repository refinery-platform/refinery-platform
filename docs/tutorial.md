# Refinery Tutorial 

Refinery is a data management, analysis, and visualization platform designed to support analysts in managing common tasks in analysis and interpretation of biomedical data. 

In this tutorial you will learn how to load data into Refinery, how to analyze it using workflows, and how to view analysis results using built-in visualization tools. Additionally, this tutorial demonstrates how to work with the data repository, how to use features that are supporting reproducible research, and how to use the collaboration tools of Refinery.

__Preparation__

To follow the steps of this tutorial, you will need a data set consisting of data files and a metadata file that is referencing your files.

__This tutorial can be completed using the Tutorial Data Set, which consists of sample ChIP-seq data ([input control][input.fastq] and [experimental][nanog.fastq] FASTQ files -- download both) and their associated [metadata file][tutorial.tsv]. Follow all steps (except creating a metadata file as it already exists) and note the bullet points after some steps with expanded instructions specific to the Tutorial Data Set.__

## 0. Accessing Refinery
1. Go to the [Refinery Launch Pad][scc-home]
  - __To create a new account__:
    1. Click *__Register__* at the top right of the navigation bar (top of page)
    2. Provide the required details and then click the *__Register__* button below
    3. Wait to receive an account activation e-mail at the address provided during registration
  - __To log in to an account__:
    1. Click *__Login__* at the top right of the navigation bar
    2. Enter the *__Username or E-mail__* and *__Password__* provided during registration and click the *__Login__* button below
    
![registerLogin](https://github.com/refinery-platform/refinery-platform/blob/develop/docs/screenshots/NavBar.png)

## 1. Creating a Metadata File
1. Compile all the metadata to be associated with the data set and then organize these metadata into a delimited (e.g. tab-delimited) text file. A template metadata file can be found [here][refinery-sample-metadata.tsv] -- note the required attributes (sample name, data file, and organism). Additional attributes can be appended as needed.
  - __Tutorial Data Set: tab-delimited__ `tutorial.tsv` __metadata file already created__

> __Column Order__: The attribute and file name columns in the metadata file can be provided in any order and the column headers can be chosen by the investigator. However, given that the data set importer (see next section below) will map column 1 to _sample name_, column 2 to _data file_, and column 3 to _organism_, it can save time during import if this information is provided in the first three columns in this order.


> __Column Names__: The column names provided in the metadata file can be freely chosen by the analyst and will be used to identify attributes throughout the Refinery application. They _must be unique_, _must not contain any special characters_, and _should be descriptive yet concise_.

## 2. Uploading a Data Set 
1. From the *__Launch Pad__*, Click *__Upload__* from the *__Data Sets__* panel
![Upload screenshot](https://github.com/refinery-platform/refinery-platform/blob/develop/docs/screenshots/DataSetsHeader.png)
2. First choose delimiter used in the metadata file and then upload the file
  - __Tutorial Data Set: upload tab-delimited__ `tutorial.tsv`
3. Check metadata *__Preview__* for accuracy (note: only first 5 samples are displayed)
4. Review *__Configure Metadata Import__* and make changes as needed
  - __Tutorial Data Set: no changes needed__
5. Click *__Add files…__* button under *__Upload Data Files__* and select data files corresponding to the metadata (note: wait for MD5 calculations, which ensure successful data file uploads, to complete)
  - __Tutorial Data Set: upload__ `input.fastq` __and__ `nanog.fastq` __data files__
6. Click *__Start upload__* to begin uploading all selected data files
7. After all data files have uploaded, click *__Upload Data Set__*

## 3. Viewing a Data Set Summary in the Data Set Browser
1. Return to the *__Launch Pad__* (Refinery homepage) and click on the newly uploaded data set title. The *__Data Set Browser__* will display a summary of the data set

## 4. Exploring Data Set Contents in the File Browser
1. Click *__View Content in File Browser__* to view the individual files belonging to the data set:
  - Files can be filtered based on attributes using the *__Attribute Filter__* in the left-hand panel
  - Files can also be sorted according to attributes (both ascending and descending) by clicking the attribute names (i.e. column headers)

> __Direct Access of Dataset Content__: The file browser can be launched directly from the data set browser by clicking on the table icon to the right of the dataset name and summary. It is not required to open the preview first.

## 5. Launching an Analysis
1. From the *__File Browser__*, select the files that will serve as input for the desired workflow
  - __Tutorial Data Set: follow the 'Launching an Analysis' section twice, first launching the *FastQC* workflow and afterwards the *TF ChIP-seq analysis using MACS2: hg19* workflow (details below) -- in both instances, select both the__ `input.fastq` __and__ `nanog.fastq` __files during this step__
2. Click the *__Analyze__* tab above the left-hand panel
3. Select one of the analysis workflows below using the drop-down menu in the left-hand panel, follow their workflow-specific steps below, and then continue with step 4
  - *__FastQC__*
    1. Select *__Current Selection__* in the *__Input Dataset__* drop-down menu in the left-hand panel
  - *__TF ChIP-seq analysis using MACS2__*
    1. Under *__Inputs (1-1 File Mapping)__*, click *__New...__* to create a new file mapping
    2. Provide a name for the new file mapping in the pop-up
    3. Drag the leftmost icons (three horizontal bars) of the input control and experimental files onto the *__input_file__* and *__exp_file__* dropzones, respectively, to create the new file mapping
      - __Tutorial Data Set: map__ `input.fastq` __to the *input_file* and__ `nanog.fastq` __to the *exp_file*__
    4. Review the attribute comparison between *__input_file__* and *__exp_file__* to confirm distinct and shared attributes are correct
4. Click *__Launch Analysis__*
5. Modify *__Analysis Name__* as needed in pop-up and then click *__Launch Analysis__*
6. Review *__Analysis Launch Status__* in pop-up and click *__View Analysis__* to monitor analysis progress within the *__File Browser__* (this *__Analyses__* tab within the *__File Browser__* can also be directly accessed by clicking the analysis name from the *__Analyses__* panel on the *__Launch Pad__*)

## 6. Viewing Analysis Results
1. Upon successful completion of an analysis, click its name from the *__Analyses__* tab within the *__File Browser__*
2. Follow the steps below corresponding to which analysis workflow was run:
  - *__FastQC__*
    1. To view *__FastQC__* results, click the bar graph icon associated with a `\#\_fastqc_results` text file
    2. Use the drop-down menu to view the results of the various *__FastQC__* analysis modules
  - *__TF ChIP-seq analysis using MACS2__*
    1. To visualize peak calling results, select files to be displayed as tracks in IGV: `\#\_MACS2_bigwig` and/or `\#\_MACS2_bed` files
    2. Click the *__Visualize__* tab above the left-hand panel
    3. Select *__Current Selection__* in the *__Select a file set__* drop-down menu in the left-hand panel
    4. Choose the appropriate species in the *__Select a species__* drop-down menu in the left-hand panel
      - __Tutorial Data Set: select *H. Sapiens (hg19)*__
    5. Click *__Web-based IGV__* to launch a visualization of the peak calling results
      - __Tutorial Data Set: search *chr12:1-35,000,000* in the IGV search box (top left) to see all the peaks__
3. To download any results file, click the down-pointing arrow icon associated with that file

## 7. Reviewing Data Provenance
1. Display a data set in the *__File Browser__* (see sections __3__ and __4__)
2. Select *__Provenance__* in the *__Display__* drop-down menu located on the right-hand side of the page
3. Review the displayed nodes to track the analysis history of the data set -- each new analysis will add a new node to the provenance graph

## 8. Creating and Modifying a Collaboration Group
1. From the *__Launch Pad__*, click *__Collaboration__* within the navigation bar
  - __Create a new group__
    1. Click the *__+__* icon in the top right of the *__Groups__* panel
    2. Choose a unique *__Group name__* and click *__Create group__*
    3. Select the new group within the *__Groups__* panel to display current members of the group within the *__Members__* panel
  - __Invite new group members__
    1. Select a group within the *__Groups__* panel and click the *__+__* icon in the top right of the *__Members__* panel
    2. Provide a *__Recipient e-mail__* address belonging to the new group member and click *__Send Invite__*
      - The new group member will then receive an invitation e-mail with instructions on how to join the group

## 9. Sharing a Data Set with a Collaboration Group
1. Display a data set in the *__Data Set Browser__* (see section __3__)
2. Click *__Share__* above the data set summary
3. Assign *__Read-only__* or *__Modify__* permissions for that data set to any groups to which you belong

## 10. Deleting an Analysis or Data Set
1. To delete an analysis only, click the trash can icon in the *__Analyses__* panel on the *__Launch Pad__*. To delete a data set and all its associated analyses, click the trash can icon in the *__Data Sets__* panel on the *__Launch Pad__*.

[refinery-sample-metadata.tsv]: https://beta.stemcellcommons.org/static/sample-files/refinery-sample-metadata.tsv
[scc-home]: https://beta.stemcellcommons.org
[input.fastq]: http://data.cloud.refinery-platform.org/?prefix=data/tutorials/introduction/input.fastq
[nanog.fastq]: http://data.cloud.refinery-platform.org/?prefix=data/tutorials/introduction/nanog.fastq
[tutorial.tsv]: http://data.cloud.refinery-platform.org/?prefix=data/tutorials/introduction/tutorial.tsv
