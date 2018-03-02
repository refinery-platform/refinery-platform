# Manual testing

* Test in [production mode](https://github.com/parklab/refinery-platform/wiki/operations#site-configuration-modes):
 * on port 80 in Vagrant VM (http://192.168.50.50/)
 * on port 443 in AWS (https://test.stemcellcommons.org)
* Test in all [supported browsers](https://github.com/parklab/refinery-platform/blob/develop/README.md)

## Use cases

> NOTE: an `(S)` before a step below denotes that there is an automated Selenium test for that behavior, and that it is an optional step

### Navbar
* ([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L36)) Login/Logout
* ([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L61)) Home/Collaboration/Statistics/About links
* User Name redirect to profile (should edit profile)
* Global analysis popover
  * Hover over icon, tooltip should appear 
  * Should open when icon is clicked
  * Click outside of popover to close
  
  
### Dashboard
#### Satori
  * Run through the [Satori manual tests](https://github.com/refinery-platform/refinery-platform/wiki/SATORI-Test-Protocol)

#### Data Sets Panel
  * Check Links
    1. ([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L98)) Collapse / expand preview
    2. Upload dataset (Just check that the upload form loads: more detailed tests below.)
    3. Dataset page (open File Browser)
  * Dataset functionality (Data cart is covered in the Satori tests)
    * search should kick in when 2 characters are provided
    * Check filters
    * Check sorting capabilities
    * Ownership and Modification icon should display correctly
    * ([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L119)) For data sets with modification permission, should be able to delete data set
  * Preview
    * Check links: view content in file browser, share, close, (if applicable source, pubmed, and analyses)
  * Share module (for data set you own)
    * Check changing permissions save
    * Cancel modal
  * Import shared ISA-Tab-based data set into user space

#### Analysis Panels
  * Check filters
  * Status, Ownership, and Modification icon should display correctly
  * ([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L153)) Deletion icon should appear and work for analyses you own

#####  Workflow Panels
  * Check filters
  * Check workflow links

### Cross-dataset file browser
On the dashboard, click on the "List" button.
* Facets
   * Search: Enter a string (like "dna") and with each keypress the matching terms should be displayed, bolded in the facet names.
   * Sort: When a facet is folded down, you should be able to sort the values either numerically or alphabetically.
   * Apply: Click on a checkbox and the facet should be applied, and the url should update
   * Combining: Multiple values within a facet should be ORed. Distinct facets should be ANDed.
* Download
   * Without adding any filters, click on "Download as CSV": You should get a large CSV: Make sure a URL is the first column, and that the number of rows is not a round number. (We want to be sure results aren't truncated.)
   * Add facet filter, download again, and make sure you have a smaller number of rows.
* Grid
   * Click on a header to sort, and click again to reverse sort.
   * Click on the download icon and a download should begin.
   * Click on the document icon and you should be taken to the dataset.

### Data set import
#### Tabular Metadata tab is the default selection
* Tabular file + custom data upload
  * Sample Tabular file (pointing to remote files): [hg19-metadata-s3.txt](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/hg19-metadata-s3.txt)
  * Sample Tabular file (pointing to local files): [hg19-metadata-local.txt](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/hg19-metadata-local.txt)
  * Sample Data Files (for hg19-metadata-local.txt): [s5_p42_E2_45min.fastq.gz](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/s5_p42_E2_45min.fastq.gz), [s5_p42_E2_45min.subsample.fastq](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/s5_p42_E2_45min.subsample.fastq),
 [s7_EV_E2_45min.fastq.gz](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/s7_EV_E2_45min.fastq.gz), [s7_EV_E2_45min.subsample.fastq](http://data.cloud.refinery-platform.org.s3.amazonaws.com/data/sample-data/human-chipseq/s7_EV_E2_45min.subsample.fastq)
* Confirm that example tabular metadata file can be downloaded
* Confirm table preview displays correctly after selecting a file
* Configure Metadata Import displays properly
  * The Required fields (Title, Sample Identifier, Data File Column, Species Column) has default selection
  * Check form validation by removing a required field 
* Under `COMPLETE SUBMISSION`, change the selection for `Does the Data File Column refer to local files?` to **Yes**. Verify that the `Check Data Files` button is performing properly.
* Verify that navigating away from file upload tab will trigger alert (once meta data file has been selected)
* Verify that if one uploads a subset of the files referenced in a Tabular file that:
    * a: The subset of referenced files are automatically imported into Refinery
    * b: The rest of the files whose data files weren't manually uploaded have lightning bolts next to them (which indicates their non-imported status)
* After submission, verify the automatic redirect to file browser
* After redirect to file browser, verify that uploaded data sets are shown properly on the Dashboard
* Hover over the download icons for the uploaded files: Verify that references to remote files from the tabular file still point to the original url unless the `Import Now` box under `ADVANCED` was checked during import (If `Import Now` was checked before the DataSet upload, the download icons should point to files local to the test instance).

#### ISA-Tab Metadata tab
Upload an ISA archive file referencing data files by URL ([examples](http://stemcellcommons.org/search/all-experiments))
* After upload, verify the automatic redirect to file browser
* After redirect to file browser, verify that uploaded data sets are shown properly on the Dashboard

Upload an ISA archive file referencing data files directly ([example](https://s3.amazonaws.com/data.cloud.refinery-platform.org/data/sample-data/isa-tabs/rfc-test-local.zip))
* Upload corresponding data files ([rfc94.txt](https://s3.amazonaws.com/data.cloud.refinery-platform.org/data/sample-data/isa-tabs/rfc94.txt), [rfc111.txt](https://s3.amazonaws.com/data.cloud.refinery-platform.org/data/sample-data/isa-tabs/rfc111.txt), [rfc134.txt](https://s3.amazonaws.com/data.cloud.refinery-platform.org/data/sample-data/isa-tabs/rfc134.txt))
* After upload, verify the automatic redirect to file browser
* After redirect to file browser, verify that uploaded data sets are shown properly on the Dashboard

### Dataset View: Display Table
#### Files Tab
  1. Select/Deselect attribute filters
  2. Reload page to see if the columns and facets are updated
  3. Save a dataset selection group
  4. Table Config (wrench button): Select/Deselect different attributes to show

> **NOTE:** The files referenced in the next section are referenced within this dataset: [hg19-metadata-s3.txt](https://github.com/refinery-platform/refinery-platform/files/1148735/hg19-metadata-s3.txt) Please import this, or ensure this has already been imported before continuing.

* Tool: FASTQC Quality Control (LIST)
    * Open tool panel and select FASTQC Quality Control
    * Select multiple files to add
    * Hover over input groups column and check popover content
    * Check tool input group display correct file names
    * Open/Collapse Description panel, Tool Input Control panel

* Tool: FASTQ Replicate Merging (LIST:LIST)
    * Open tool panel and select FASTQ Replicate Merging
    * Select multiple files to add
    * Nav to a new group both through selection popover and tool input control
    * Hover over input groups column and check popover content
    * Check tool input group display correct file names
    * Test out remove and remove all functionality
    * Open/Collapse Description panel, Tool Input Control panel

* Tool: MACS2 Chip-Seq Peak Calling (LIST:PAIR)
    * Open tool panel and select MACS2 Chip-Seq Peak Calling
    * Select multiple files to add
    * Nav to a new group both through selection popover and tool input control
    * Hover over input groups column and check popover content
    * Toggle tool input group "Input Details" and check pair content
    * Test out remove and remove all functionality
    * Open/Collapse Description panel, Tool Input Control panel

#### Analyses Tab
  1. Ensure new analyses are showing up for datasets and refreshing (30secs)
  2. Cancel an analysis (Ensure it responds and page refreshes)
  3. Ensure global analyses status shows any new analyses 
        * Running analyses should show the three different stages
        * Completed analyses will show colored completion (success/failure) state.
        * Click on analysis link will redirect you to file browser - analysis filtered & close popover
  4. Test collapse/expand for running analyses
#### Details Tab
  1. Fields are populated correctly
  2. META DATA download link 
  3. Import shared ISA-Tab-based data set into user space
  4. Sharing: Correct owner is showing with profile link & groups with permission icons and link
 
#### Provenance Tab
  1. Zoom in/out on graph
  2. Drag view around
  3. Select/Deselect nodes
  4. Are the layer/analysis/analysis group/workflow buttons working?
  5. Attributes Filter

### Collaboration
* In the "Groups" panel:
  1. Clicking on one of the group rows should cause the "Members" panel to update
  2. If you are a manager, that should be indicated in the "Permission" column
  3. Add Group (form validations should catch duplicate names and too short names)
  4. Check Group Edit
     * If a group manager, check deletion of group
     * If just a member, leave the group (You will need to ask another user to invite you to their Group to test this. You may also register another user, and invite that user to a Group you manage and test this functionality with the newly invited user.)
* In the "Members" panel:
  1. Member links should go to user's profile
  2. Permissions column should have "manager" as appropriate
  3. Add members by email address (confirm that form validation catches invalid emails)
     * The "Pending Invitations" panel should update
  4. Members Edit
     * Check remove and demote actions
* Pending Invitations
  1. After inviting new members, check revoke and resend capability

### Email notifications
Make sure email notifications go out when running on AWS

### Statistics
([S](https://github.com/refinery-platform/refinery-platform/blob/develop/refinery/selenium_testing/tests.py#L69)) Info display correctly

### About
Info displays correctly

### IGV
* Make sure that web-based IGV is functioning properly 
* Make sure `.bam` files that have been imported into Refinery can be visualized in IGV at the most zoomed-in level.
(RNA-Seq Analyses create a `1_tophat_accepted_hits.bam` file. Navigate to a DataSet with one of those Analyses run upon it and launch IGV with one or more of those bam files as you current selection) 
* Examples of the filetypes supported by IGV.js are available at http://data.cloud.refinery-platform.org/?prefix=data/igv-sample/. They are: seg, gff, wig, bed, bedgraph, and vcf. 

### Tutorials
* Make sure you can run through each of the tutorials from `Help ?` in the navbar

### Satori
* Follow the manual testing steps for the Satori repository exploration code illustrated at [this link](https://github.com/refinery-platform/refinery-platform/wiki/SATORI-Test-Protocol).

### Administrator

* One tester with admin privs should confirm that new user registration works.
* Provision an instance from scratch both locally using Vagrant and on AWS (makes sure no errors are reported)
* Check that the following is present:
  * AnonymousUser object in the database
  * Guest account (disabled on AWS and enabled locally by default)
* Create a Galaxy connector and a workflow engine, and import workflows from a Galaxy instance (Refinery test workflow, FastQC, ChIP-seq and RNA-seq)