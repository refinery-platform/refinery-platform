history_dict = {
    'contents_url': '/api/histories/9b5c597dcbb59371/contents',
    'id': '9b5c597dcbb59371',
    'state_details': {
        'discarded': 0, 'ok': 0,
        'failed_metadata': 0, 'upload': 0,
        'paused': 0, 'running': 0,
        'setting_metadata': 0, 'error': 0,
        'new': 0, 'queued': 0, 'empty': 0
    },
    'state': 'new',
    'name': (
        'History for: Tool: WORKFLOW Test workflow: 5 steps '
        'without branching 0103d21a-d709-43a7-9448-0e06f44d9ed9'
    ),
    'url': '/api/histories/9b5c597dcbb59371',
    'state_ids': {
        'discarded': [], 'ok': [],
        'failed_metadata': [], 'upload': [],
        'paused': [], 'running': [],
        'setting_metadata': [], 'error': [],
        'new': [], 'queued': [], 'empty': []
    },
    'purged': False
}

library_dict = {'id': 'a03c847bfa9a8077'}

library_dataset_dict = [{'id': 'f29b25b2abcdb977'}]

history_dataset_dict = {
    'file_name': '/Galaxy/galaxy/database/files/000/dataset_633.dat',
    'creating_job': '4e889f526a9d99a4',
    'dataset_id': '4e889f526a9d99a4',
    'id': 'fbb4f924481c9afd',
    'history_id': '9b5c597dcbb59371',
    'name': 'http://192.168.50.50:8000/media/file_store/d8/10/file1.txt',
    'url': '/api/histories/9b5c597dcbb59371/contents/fbb4f924481c9afd',
    'purged': False
}

galaxy_workflow_invocation_data = {
    'update_time': '2017-07-26T19:19:25.833503',
    'history_id': 'b2486a20bc56b90f',
    'state': 'new',
    'workflow_id': '6fc9fbb81c497f69',
    'id': '52e496b945151ee8'
}

galaxy_workflow_dict = {
    'name': 'list test wf',
    'steps': {
        '1': {
            'tool_id': 'refinery_test_LIST-N-1',
            'id': 1,
            'input_connections': {
                'input_file': {
                    'output_name': 'output',
                    'id': 0
                }
            },
            'workflow_outputs': [
                {
                    'output_name': 'Refinery test tool LIST - N on data 4',
                    'uuid': '8adc43a1-e075-4ad5-be6a-b9791532b801',
                },
                {
                    'output_name': 'Output file',
                    'uuid': 'adc43a1-e075-4ad5-be6a-b9791532b8018',
                }
            ],
            'outputs': [
                {
                    'type': 'txt',
                    'name': 'Refinery test tool LIST - N on data 4'
                },
                {
                    'type': 'txt',
                    'name': 'Output file'
                }
            ],
            'name': 'Refinery test tool LIST - N - 1',
            'type': 'tool',
            'position': {
                'top': 513,
                'left': 822
            }
        },
        '2': {
            'tool_id': 'refinery_test_LIST-N-2',
            'id': 2,
            'input_connections': {
                'input_name': {
                    'output_name': 'Refinery test tool LIST - N on data 4',
                    'id': 1
                }
            },
            'workflow_outputs': [
                {
                    'output_name': 'Refinery test tool LIST - N on data 3',
                    'uuid': '5b5625c7-3c28-4542-b9c5-2ca9cee301b0',
                },
                {
                    'output_name': 'Output file',
                    'uuid': 'adc43a1-4ad5-e075-be6a-b9791532b8018',
                }
            ],
            'outputs': [
                {
                    'type': 'txt',
                    'name': 'Refinery test tool LIST - N on data 3'
                },
                {
                    'type': 'txt',
                    'name': 'Output file'
                }
            ],
            'name': 'Refinery test tool LIST - N - 2',
            'type': 'tool',
            'position': {
                'top': 513,
                'left': 822
            }
        },
        '0': {
            'tool_id': None,
            'id': 0,
            'input_connections': {},
            'inputs': [{'name': 'Input Dataset'}],
            'name': 'input',
            'type': 'data_input',
            'position': {
                'top': 908,
                'left': 207
            }
        }
    }
}
galaxy_workflow_dict_collection = {
    'name': 'list test wf',
    'steps': {
        '1': {
            'tool_id': 'refinery_test_LIST-N-1',
            'id': 1,
            'input_connections': {
                'input_file': {
                    'output_name': 'output',
                    'id': 0
                }
            },
            'workflow_outputs': [
                {
                    'output_name': 'Refinery test tool LIST - N on data 4',
                    'uuid': '8adc43a1-e075-4ad5-be6a-b9791532b801',
                },
                {
                    'output_name': 'Output file',
                    'uuid': 'adc43a1-e075-4ad5-be6a-b9791532b8018',
                }
            ],
            'outputs': [
                {
                    'type': 'txt',
                    'name': 'Refinery test tool LIST - N on data 4'
                },
                {
                    'type': 'txt',
                    'name': 'Output file'
                }
            ],
            'name': 'Refinery test tool LIST - N - 1',
            'type': 'tool',
            'position': {
                'top': 513,
                'left': 822
            }
        },
        '2': {
            'tool_id': 'refinery_test_LIST-N-2',
            'id': 2,
            'input_connections': {
                'input_name': {
                    'output_name': 'Refinery test tool LIST - N on data 4',
                    'id': 1
                }
            },
            'workflow_outputs': [
                {
                    'output_name': 'Refinery test tool LIST - N on data 3',
                    'uuid': '5b5625c7-3c28-4542-b9c5-2ca9cee301b0',
                },
                {
                    'output_name': 'Output file',
                    'uuid': 'adc43a1-4ad5-e075-be6a-b9791532b8018',
                }
            ],
            'outputs': [
                {
                    'type': 'txt',
                    'name': 'Refinery test tool LIST - N on data 3'
                },
                {
                    'type': 'txt',
                    'name': 'Output file'
                }
            ],
            'name': 'Refinery test tool LIST - N - 2',
            'type': 'tool',
            'position': {
                'top': 513,
                'left': 822
            }
        },
        '0': {
            'tool_id': None,
            'id': 0,
            'input_connections': {},
            'inputs': [{'name': 'Input Dataset Collection'}],
            'name': 'input',
            'type': 'data_collection_input',
            'position': {
                'top': 908,
                'left': 207
            }
        }
    }
}

galaxy_datasets_list = [
    {
        'creating_job': 'JOB_A_ID',
        'file_size': 406,
        'dataset_id': 'gergg34g34g44',
        'id': 'd32aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Refinery test tool LIST - N on data 4',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': False,
        'uuid': '8adc43a1-e075-4ad5-be6a-b9791532b801'
    },
    {
        'creating_job': 'JOB_B_ID',
        'file_size': 406,
        'dataset_id': '34g34g34g3g34g3',
        'id': 'd22aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Refinery test tool LIST - N on data 3',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': False,
        'uuid': '5b5625c7-3c28-4542-b9c5-2ca9cee301b0'
    },
    {
        'creating_job': 'JOB_A_ID',
        'file_size': 406,
        'dataset_id': '4gh33gt34g34g',
        'id': 'd32aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Refinery test tool LIST - N on data 2',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': True,
        'uuid': 'db331eb4-313a-47e0-9998-0e4aa03786d4'
    }
]

galaxy_datasets_list_same_output_names = [
    {
        'creating_job': 'JOB_A_ID',
        'file_size': 406,
        'dataset_id': 'gergg34g34g44',
        'id': 'd32aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Output file',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': False,
        'uuid': 'adc43a1-4ad5-e075-be6a-b9791532b8018'
    },
    {
        'creating_job': 'JOB_B_ID',
        'file_size': 406,
        'dataset_id': '34g34g34g3g34g3',
        'id': 'd22aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Output file',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': False,
        'uuid': 'adc43a1-e075-4ad5-be6a-b9791532b8018'
    },
    {
        'creating_job': 'JOB_A_ID',
        'file_size': 406,
        'dataset_id': '4gh33gt34g34g',
        'id': 'd32aba4ae7b4124a',
        'state': 'ok',
        'history_id': '67ce804af6ec796b',
        'name': 'Output file',
        'file_ext': 'txt',
        'url': '/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        'purged': True,
        'uuid': 'adc43a1-4ad5-e075-be6a-b9791532b8018'
    }
]

galaxy_workflow_invocation = {
    'inputs': {'0': {'src': 'hdca', 'id': 'f0cc9868bc58f90b'}},
    'history_id': '67ce804af6ec796b',
    'workflow_id': '4a56addbcc836c23',
    'steps': [
        {'job_id': 'JOB_A_ID', 'order_index': 1,
         'workflow_step_id': '507bf06c009b95ec',
         'id': 'ae7005de11c97062'},
        {'job_id': 'JOB_B_ID', 'order_index': 2,
         'workflow_step_id': '0g09e6c0c50b957b',
         'id': '45765uytrerd2t4'}
    ],
    'id': 'ddaca2bad6847b13'
}

galaxy_tool_data = {
    'inputs': [
        {'type': 'data', 'name': 'input_file'},
        {'name': 'sleep_time', 'value': '0', 'type': 'integer'},
        {'type': 'boolean', 'value': False, 'name': 'empty_outfile'},
        {'name': 'p_fail', 'value': '0.0', 'type': 'float'},
        {'type': 'boolean', 'value': False, 'name': 'stdout'},
        {'type': 'boolean', 'value': False, 'name': 'stderr'},
        {'name': 'exit_code', 'value': '0', 'type': 'integer'}
    ],
    'id': 'refinery_test_LIST-N',
    'name': 'Refinery test tool LIST - N'}

galaxy_job_a = {
    'tool_id': 'refinery_test_1-1/0.1',
    'update_time': '2017-08-29T14:53:07.283924',
    'inputs': {
        'input_file': {
            'src': 'hda', 'id': '0dd7fa018f646963',
            'uuid': 'e26b0ec5-7b74-451d-a0a0-63dac713ecf8'
        }
    },
    'outputs': {
        'Refinery test tool LIST - N on data 4': {
            'src': 'hda',
            'uuid': '8adc43a1-e075-4ad5-be6a-b9791532b801'
        },
        'Output file': {
            'src': 'hda',
            'uuid': 'adc43a1-4ad5-e075-be6a-b9791532b8018'
        }
    },
    'exit_code': 0,
    'state': 'ok',
    'create_time': '2017-08-29T14:53:02.518515',
    'params': {
        '__workflow_invocation_uuid__': '"c11aecf08cc911e786c3a0999b05d96b"',
        'stdout': '"False"',
        'exit_code': '"0"',
        'p_fail': '"0.0"',
        'empty_outfile': '"False"',
        'stderr': '"False"',
        'sleep_time': '"0"'
    },
    'model_class': 'Job',
    'external_id': '16585',
    'id': 'JOB_A_ID'
}
galaxy_job_b = {
    'tool_id': 'refinery_test_1-2/0.1',
    'update_time': '2017-08-29T14:53:07.283924',
    'inputs': {
        'input_file': {
            'src': 'hda', 'id': '0dd7fa018f646963',
            'uuid': 'e26b0ec5-7b74-451d-a0a0-63dac713ecf8'
        }
    },
    'outputs': {
        'Refinery test tool LIST - N on data 3': {
            'src': 'hda',
            'uuid': '5b5625c7-3c28-4542-b9c5-2ca9cee301b0'
        },
        'Output file': {
            'src': 'hda',
            'uuid': 'adc43a1-e075-4ad5-be6a-b9791532b8018'
        }
    },
    'exit_code': 0,
    'state': 'ok',
    'create_time': '2017-08-29T14:53:02.518515',
    'params': {
        '__workflow_invocation_uuid__': '"c11aecf08cc911e786c3a0999b05d96b"',
        'stdout': '"False"',
        'exit_code': '"0"',
        'p_fail': '"0.0"',
        'empty_outfile': '"False"',
        'stderr': '"False"',
        'sleep_time': '"0"'
    },
    'model_class': 'Job',
    'external_id': '16585',
    'id': 'JOB_B_ID'
}

galaxy_dataset_provenance_0 = {
    'tool_id': 'refinery_test_1-1/0.1',
    'job_id': 'JOB_B_ID',
    'parameters': {
        'input_file': {
            'id': '3490b582fa824276',
            'uuid': 'c006a9f8-d045-4ca9-898b-f9824d8b7064'
        },
        'stdout': '"False"',
        'exit_code': '"0"',
        'p_fail': '"0.0"',
        '__workflow_invocation_uuid__': '"2020accf8cc911e78b16a0999b05d96b"',
        'stderr': '"False"',
        'sleep_time': '"0"',
        'empty_outfile': '"False"'
    }, 'stdout': '',
    'stderr': '',
    'id': '3d06ca9f4b3928d1',
    'uuid': 'bd8678e2-1a18-4753-b274-e1870257234a'
}

galaxy_dataset_provenance_1 = {
    'tool_id': 'upload1',
    'job_id': 'JOB_A_ID',
    'parameters': {
        'uuid': 'null',
        'file_type': '"auto"',
        'files_metadata': '{"file_type": "auto", "__current_case__": 39}',
        'async_datasets': '"None"',
        'dbkey': '"?"',
        'link_data_only': '"copy_files"'
    },
    'stdout': '',
    'stderr': '',
    'id': '37c9a40e10ec0927',
    'uuid': 'c006a9f8-d045-4ca9-898b-f9824d8b7064'
}


def create_galaxy_history_content_entry(**kwargs):
    return dict(
        {
            'history_content_type': 'dataset',
            'history_id': '16049f285897632e',
            'deleted': False,
            'visible': False,
            'type': 'file'
        },
        **kwargs
    )


galaxy_history_contents = [
    create_galaxy_history_content_entry(
        name='Refinery test tool LIST - N on data 4',
        extension='txt',
        type_id='dataset-323a8090ca61e992',
        id='323a8090ca61e992',
        state='ok',
        hid=1,
        url='/api/histories/16049f285897632e/contents/323a8090ca61e992',
        dataset_id='gergg34g34g44',
        purged=False
    ),
    create_galaxy_history_content_entry(
        name='Refinery test tool LIST - N on data 3',
        extension='txt',
        type_id='dataset-a05aafa4cb14c422',
        id='a05aafa4cb14c422',
        state='ok',
        hid=2,
        url='/api/histories/16049f285897632e/contents/a05aafa4cb14c422',
        dataset_id='34g34g34g3g34g3',
        purged=False
    ),
    create_galaxy_history_content_entry(
        history_content_type='dataset_collection',
        name='List collection',
        populated=True,
        visible=True,
        collection_type='list',
        hid=3,
        url='/api/histories/16049f285897632e/contents/dataset_collections/'
            '1cb420fddc70d60d',
        type='collection',
        id='1cb420fddc70d60d',
        populated_state='ok'
    )
]

galaxy_history_contents_same_names = [
    dict(item, name="Output file") for item in galaxy_history_contents
    if item.get("history_content_type") == "dataset"
]
