.. _preparing_galaxy_workflows:

Preparing Galaxy Workflows for Refinery
=======================================

To :ref:`import a Galaxy workflow <importing_galaxy_workflows>` into Refinery, you 
first have to annotated the workflow. The amount of annotation required is minimal and you
can conveniently add the annotation for the workflow in the Galaxy workflow editor.

In a nutshell, you have to provide simple Python dictionaries (see examples below if you are not 
familiar with Python) in the "annotation" text fields for the workflow and corresponding tools.
These fields can be found on the right side of the workflow editor.
 
Annotation fields must either be empty of contain correctly formatted annotation
dictionaries as described below. If other information is found in an annotation field,
you will not be able to import the workflow into Refinery.  


Workflow-Level Annotations
--------------------------

For Refinery to recognize a Galaxy workflow as a Refinery *Workflow*, you need to
provide a set of simple annotations in the workflow annotation field in the 
Galaxy workflow editor. The annotation field is listed under "Edit Attributes" on the
right side of the workflow editor. 

.. note::
   The annotation fields in the Galaxy workflow editor behave slightly differently
   for workflow-level and tool-level annotations. In order to confirm changes to
   a workflow-level annotation, move the cursor to the end of the input field and
   hit the ``Return`` key. This is not required in tool-level annotation fields.
   **Be sure to save the workflow after editing an annotation field.** 

The workflow-level annotation is a Python dictionary with the following keys:

``refinery_type``: ``string``
	**Required** | This field is used to tell Refinery how it should treat the workflow.
	Refinery *Workflows* are either *analysis* or (bulk) *download* workflows. The outputs of analysis *Workflows*
	will be inserted into the *Data Set* and connected to their inputs in the experiment graph. The outputs
	of bulk download *Workflows* are assumed to be archive files (zip files, tarballs) and will be associated
	with the *Data Set* but will appear in a list of available downloads.

``refinery_relationship``: ``array of dictionaries``
	**Optional** | This field is used to describe relationships between inputs of the *Workflow*.
	For example, a *Workflow* that performs peak-calling on ChIP-seq data, requires 
	that each ChIP file is associated with one input file (= genomic background). Such relationships
	are described using dictionary with three fields:
	
	``category``: ``string``
		**Required** |  Describes the type of the relationship between files and can be one
		of ``1-1``, ``1-N``, ``N-1``, ``REPLICATE``.

	``set1``: ``string``
		**Required** |  For ``1-1``, ``1-N``, ``N-1`` and ``REPLICATE`` relationships, this must refer to the
		name of the corresponding workflow input, for example to the input used for the ChIP file.

	``set2``: ``string``
		**Required** (not for ``REPLICATE`` relationships) | For ``1-1``, ``1-N`` and ``N-1``, this must refer to the
		name of the corresponding workflow input, for example to the input used for the input file (= genomic background).

Schematic tool annotation (indentation only for better readability):

.. code-block:: python

	{
		"refinery_type": "<workflow_type>",
		"refinery_relationships": [
			{
				"category": "<relationship_type>",
				"set1": "<name_of_input_1>",
				"set2": "<name_of_input_2>"
			}
		]
	}
		 

Examples
^^^^^^^^
		 
A standard analysis workflow with a single input would be annotated as follows: 

.. code-block:: python

	{
		"refinery_type": "analysis"
	}
	
A download workflow would be annotated like this:

.. code-block:: python

	{
		"refinery_type": "download"
	}
	
A more complex analysis workflow with two inputs and a `1-1` relationship between two
inputs named "ChIP file" and "input file" would be annotated as follows: (the name fields of the two input datasets are set to "left input file" and "right input file", respectively)

.. code-block:: python

	{
		"refinery_type": "analysis",
		"refinery_relationships": [
			{
				"category": "1-1",
				"set1": "ChIP file",
				"set2": "input file"
			}
		]
	}
	

Tool-Level Annotations
----------------------

In order to import output files generated a tool
in the workflow into Refinery, the tool has to be annotated. To access the annotation field
for a tool, click on the tool representation in the workflow editor. The annotation field
is named "Annotation / Notes".

.. note::
   You have to annotate at least one tool and one output file. Workflows that do not declare
   outputs for import into Refinery will not be imported.  

Like in workflow-level annotations, the annotation needs to be provided as a Python
dictionary. In order to import output files of the tool back into Refinery, the
tool-level annotation dictionary needs to contain a key that is the same as the
output declared by the tool, for example ``"output_file"``. 

This key must be associated with a further dictionary that provides a name, that
will be used to import the file into Refinery. Optionally, a description can be
provided to further explain the content of the output file, as well as a file
type, if the file extension provided by Galaxy is not sufficient to detect the
actual file type automatically. This is typically the case when Galaxy uses
"data" as the file extension.

``name``: ``string``
	**Required** | A descriptive name for the output file. If output files from multiple tools in the workflow
	are imported back into Refinery, it is recommended to include the name of the tool in the 
	file name.
	
``description``: ``string``
	**Optional** | A description of the file. This will be shown in the description of the workflow outputs.
	
``type``: ``string``
	**Optional** | The abbreviation/extension of a file type registered in Refinery. 

Schematic tool annotation (indentation only for better readability)

.. code-block:: python

	{
		"<tool_output_1>": {
			"name": "<filename_1>",
			"description": "<description_1>",
			"type": "<extension_1>"
		},
		"<tool_output_2>": {
			"name": "<filename_2>",
			"description": "<description_2>",
			"type": "<extension_2>"
		}
	}
	
Example
^^^^^^^  

The following example use indentation for better readability. Indentation is not
required.

.. code-block:: python

	{
		"output_narrow_peak": {
			"name": "spp_narrow_peak",
			"description": "",
			"type": "bed"
		},
		"output_region_peak": {
			"name": "spp_region_peak",
			"description": "",
			"type": "bed"
		},
		"output_plot_file": {
			"name": "spp_plot_file",
			"description": "",
			"type": "pdf"
		}
	}