history_dict = {
    u'contents_url': u'/api/histories/9b5c597dcbb59371/contents',
    u'id': u'9b5c597dcbb59371',
    u'state_details': {
        u'discarded': 0, u'ok': 0,
        u'failed_metadata': 0, u'upload': 0,
        u'paused': 0, u'running': 0,
        u'setting_metadata': 0, u'error': 0,
        u'new': 0, u'queued': 0, u'empty': 0
    },
    u'state': u'new',
    u'name': (
        u'History for: Tool: WORKFLOW Test workflow: 5 steps '
        u'without branching 0103d21a-d709-43a7-9448-0e06f44d9ed9'
    ),
    u'url': u'/api/histories/9b5c597dcbb59371',
    u'state_ids': {
        u'discarded': [], u'ok': [],
        u'failed_metadata': [], u'upload': [],
        u'paused': [], u'running': [],
        u'setting_metadata': [], u'error': [],
        u'new': [], u'queued': [], u'empty': []
    },
    u'purged': False
}

library_dict = {u'id': u'a03c847bfa9a8077'}

library_dataset_dict = [{u'id': u'f29b25b2abcdb977'}]

history_dataset_dict = {
    u'file_name': u'/Galaxy/galaxy/database/files/000/dataset_633.dat',
    u'creating_job': u'4e889f526a9d99a4',
    u'dataset_id': u'4e889f526a9d99a4',
    u'id': u'fbb4f924481c9afd',
    u'history_id': u'9b5c597dcbb59371',
    u'name': u'http://192.168.50.50:8000/media/file_store/d8/10/file1.txt',
    u'url': u'/api/histories/9b5c597dcbb59371/contents/fbb4f924481c9afd',
    u'purged': False
}

galaxy_workflow_invocation_data = {
    u'update_time': u'2017-07-26T19:19:25.833503',
    u'history_id': u'b2486a20bc56b90f',
    u'state': u'new',
    u'workflow_id': u'6fc9fbb81c497f69',
    u'id': u'52e496b945151ee8'
}

galaxy_workflow_dict = {
    u'name': u'list test wf',
    u'steps': {
        u'1': {u'tool_id': u'refinery_test_LIST-N', u'id': 1,
               u'name': u'Refinery test tool LIST - N'},
        u'0': {u'tool_id': u'refinery_test_LIST-N', u'id': 0,
               u'name': u'Refinery test tool LIST - N', u'type': u'data_input'}
    }
}

galaxy_datasets_list = [
    {
        u'creating_job': u'efwefwee75g27398cd',
        u'file_size': 406,
        u'dataset_id': u'gergg34g34g44',
        u'id': u'd32aba4ae7b4124a',
        u'state': u'ok',
        u'history_id': u'67ce804af6ec796b',
        u'name': u'Refinery test tool LIST - N on data 4',
        u'file_ext': u'txt',
        u'url': u'/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        u'purged': False
    },
    {
        u'creating_job': u'1d1dbe75827398cd',
        u'file_size': 406,
        u'dataset_id': u'34g34g34g3g34g3',
        u'id': u'd22aba4ae7b4124a',
        u'state': u'ok',
        u'history_id': u'67ce804af6ec796b',
        u'name': u'Refinery test tool LIST - N on data 2',
        u'file_ext': u'txt',
        u'url': u'/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        u'purged': False
    },
    {
        u'creating_job': u'32456789rwjefvtg7',
        u'file_size': 406,
        u'dataset_id': u'4gh33gt34g34g',
        u'id': u'd32aba4ae7b4124a',
        u'state': u'ok',
        u'history_id': u'67ce804af6ec796b',
        u'name': u'Refinery test tool LIST - N on data 1',
        u'file_ext': u'txt',
        u'url': u'/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        u'purged': True
    }
]

galaxy_workflow_invocation = {
    u'inputs': {u'0': {u'src': u'hdca', u'id': u'f0cc9868bc58f90b'}},
    u'history_id': u'67ce804af6ec796b',
    u'workflow_id': u'4a56addbcc836c23',
    u'steps': [
        {u'job_id': u'1d1dbe75827398cd', u'order_index': 1,
         u'workflow_step_id': u'507bf06c009b95ec',
         u'id': u'ae7005de11c97062'},
        {u'job_id': u'efwefwee75g27398cd', u'order_index': 1,
         u'workflow_step_id': u'507bg06c009b95ec',
         u'id': u'ae7005de11c97062'},
        {u'job_id': u'32456789rwjefvtg7', u'order_index': 1,
         u'workflow_step_id': u'507bg06c009b95ec',
         u'id': u'45765uytrerd2t4'}
    ],
    u'id': u'ddaca2bad6847b13'
}

galaxy_history_download_list = [
    {
        u'name': u'Refinery test tool LIST - N on data 14',
        u'state': u'ok', u'file_size': 211,
        u'dataset_id': u'8ee788c99983ff96', u'type': u'txt'
    },
    {
        u'name': u'Refinery test tool LIST - N on data 13',
        u'state': u'ok', u'file_size': 211,
        u'dataset_id': u'14bb1cdaa43f5769', u'type': u'txt'
    },
    {
        u'name': u'Refinery test tool LIST - N on data 12',
        u'state': u'ok', u'file_size': 714,
        u'dataset_id': u'953f3a3e2982a4fa', u'type': u'txt'
    }
]

galaxy_tool_data = {
    u'inputs': [
        {u'type': u'data', u'name': u'input_file'},
        {u'name': u'sleep_time', u'value': u'0', u'type': u'integer'},
        {u'type': u'boolean', u'value': False, u'name': u'empty_outfile'},
        {u'name': u'p_fail', u'value': u'0.0', u'type': u'float'},
        {u'type': u'boolean', u'value': False, u'name': u'stdout'},
        {u'type': u'boolean', u'value': False, u'name': u'stderr'},
        {u'name': u'exit_code', u'value': u'0', u'type': u'integer'}
    ],
    u'id': u'refinery_test_LIST-N',
    u'name': u'Refinery test tool LIST - N'}

galaxy_job = {
    u'tool_id': u'refinery_test_1-1/0.1',
    u'update_time': u'2017-08-29T14:53:07.283924', u'inputs': {
        u'input_file': {u'src': u'hda', u'id': u'0dd7fa018f646963',
                        u'uuid': u'e26b0ec5-7b74-451d-a0a0-63dac713ecf8'}},
    u'outputs': {u'output_file': {u'src': u'hda', u'id': u'6189d907339532bf'}},
    u'exit_code': 0, u'state': u'ok',
    u'create_time': u'2017-08-29T14:53:02.518515', u'params': {
        u'__workflow_invocation_uuid__': u'"c11aecf08cc911e786c3a0999b05d96b"',
        u'stdout': u'"False"', u'exit_code': u'"0"', u'dbkey': u'"?"',
        u'p_fail': u'"0.0"', u'empty_outfile': u'"False"',
        u'stderr': u'"False"',
        u'sleep_time': u'"0"'}, u'model_class': u'Job',
    u'external_id': u'16585', u'id': u'38fe481bc1c2ecc0'}

galaxy_dataset_provenance_0 = {
    u'tool_id': u'refinery_test_1-1/0.1',
    u'job_id': u'79623814bfa3e11b', u'parameters': {
        u'input_file': {u'id': u'3490b582fa824276',
                        u'uuid': u'c006a9f8-d045-4ca9-898b-f9824d8b7064'},
        u'stdout': u'"False"', u'exit_code': u'"0"', u'dbkey': u'"?"',
        u'p_fail': u'"0.0"',
        u'__workflow_invocation_uuid__': u'"2020accf8cc911e78b16a0999b05d96b"',
        u'stderr': u'"False"',
        u'sleep_time': u'"0"', u'empty_outfile': u'"False"'}, u'stdout': u'',
    u'stderr': u'', u'id': u'3d06ca9f4b3928d1',
    u'uuid': u'bd8678e2-1a18-4753-b274-e1870257234a'}

galaxy_dataset_provenance_1 = {
    u'tool_id': u'upload1',
    u'job_id': u'7fc964d8785be9fd',
    u'parameters': {
        u'uuid': u'null', u'file_type': u'"auto"',
        u'files_metadata': u'{"file_type": "auto", "__current_case__": 39}',
        u'async_datasets': u'"None"', u'dbkey': u'"?"',
        u'link_data_only': u'"copy_files"'}, u'stdout': u'', u'stderr': u'',
    u'id': u'37c9a40e10ec0927',
    u'uuid': u'c006a9f8-d045-4ca9-898b-f9824d8b7064'}
