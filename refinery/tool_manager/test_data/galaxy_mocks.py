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
               u'name': u'Refinery test tool LIST - N'}
    }
}

galaxy_datasets_list = [
    {
        u'creating_job': u'1d1dbe75827398cd',
        u'file_size': 406,
        u'dataset_id': u'953f3a3e2982a4fa',
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
        u'dataset_id': u'953f3a3e3982a4fa',
        u'id': u'd22aba4ae7b4124a',
        u'state': u'ok',
        u'history_id': u'67ce804af6ec796b',
        u'name': u'Refinery test tool LIST - N on data 2',
        u'file_ext': u'txt',
        u'url': u'/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
        u'purged': False
    },
    {
         u'creating_job': u'1d1dbe75827398cd',
         u'file_size': 406,
         u'dataset_id': u'953f3a3e2982a4fa',
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
        {u'job_id': u'1d1dbe75827398cd', u'order_index': 1,
            u'workflow_step_id': u'507bf06c009b95ec',
            u'id': u'ae7005de11c97062'}
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
