history_dict = {
    u'importable': False,
    u'create_time': u'2017-07-24T15:13:51.786538',
    u'contents_url': u'/api/histories/9b5c597dcbb59371/contents',
    u'id': u'9b5c597dcbb59371', u'size': 0,
    u'user_id': u'f597429621d6eb2b',
    u'username_and_slug': None, u'annotation': None,
    u'state_details': {
        u'discarded': 0, u'ok': 0,
        u'failed_metadata': 0, u'upload': 0,
        u'paused': 0, u'running': 0,
        u'setting_metadata': 0, u'error': 0,
        u'new': 0, u'queued': 0, u'empty': 0
    },
    u'state': u'new', u'empty': True,
    u'update_time': u'2017-07-24T15:13:51.786563',
    u'tags': [], u'deleted': False, u'genome_build': None,
    u'slug': None,
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
    u'published': False, u'model_class': u'History',
    u'purged': False
}

library_dict = {
    u'can_user_add': True, u'description': u'', u'deleted': False,
    u'can_user_manage': True, u'can_user_modify': True,
    u'create_time_pretty': u'', u'id': u'a03c847bfa9a8077',
    u'synopsis': u'',
    u'create_time': u'2017-07-24T15:13:51.743507',
    u'root_folder_id': u'Fa03c847bfa9a8077',
    u'model_class': u'Library', u'public': True,
    u'name': (u'Library for: Tool: WORKFLOW Test workflow: 5 steps without '
              u'branching 0103d21a-d709-43a7-9448-0e06f44d9ed9')
}

library_dataset_dict = [
    {
        u'url': u'/api/libraries/a03c847bfa9a8077/contents/f29b25b2abcdb977',
        u'name': u'http://192.168.50.50:8000/media/file_store/d8/10/file1.txt',
        u'id': u'f29b25b2abcdb977'
    }
]

history_dataset_dict = {
    u'accessible': True,
    u'type_id': u'dataset-fbb4f924481c9afd',
    u'file_name': u'/Galaxy/galaxy/database/files/000/dataset_633.dat',
    u'resubmitted': False,
    u'create_time': u'2017-07-24T15:16:52.292025',
    u'creating_job': u'4e889f526a9d99a4', u'file_size': 0,
    u'dataset_id': u'4e889f526a9d99a4',
    u'id': u'fbb4f924481c9afd', u'misc_info': None,
    u'hda_ldda': u'hda',
    u'download_url': (
        u'/api/histories/9b5c597dcbb59371/contents/fbb4f924481c9afd/display'
    ),
    u'state': u'queued', u'display_types': [],
    u'display_apps': [], u'permissions': {u'access': [],
                                          u'manage': [
                                              u'f597429621d6eb2b']},
    u'type': u'file', u'misc_blurb': None, u'peek': None,
    u'update_time': u'2017-07-24T15:16:52.351402',
    u'data_type': u'galaxy.datatypes.data.Text',
    u'tags': [], u'deleted': False,
    u'history_id': u'9b5c597dcbb59371', u'meta_files': [],
    u'genome_build': u'?', u'hid': 1, u'visualizations': [
        {
            u'href': (u'/plugins/visualizations/charts/show?dataset_id'
                      u'=fbb4f924481c9afd'),
            u'target': u'galaxy_main',
            u'html': u'Charts',
            u'embeddable': False
        }
    ],
    u'metadata_data_lines': None, u'file_ext': u'auto',
    u'annotation': None, u'metadata_dbkey': u'?',
    u'history_content_type': u'dataset',
    u'name': u'http://192.168.50.50:8000/media/file_store/d8/10/file1.txt',
    u'extension': u'auto', u'visible': True,
    u'url': u'/api/histories/9b5c597dcbb59371/contents/fbb4f924481c9afd',
    u'uuid': u'ad7e3cad-a512-4351-92bb-f5dd55d5fc4c',
    u'model_class': u'HistoryDatasetAssociation',
    u'rerunnable': False, u'purged': False,
    u'api_type': u'file'
}

galaxy_workflow_invocation_data = {
    u'update_time': u'2017-07-26T19:19:25.833503',
    u'uuid': u'56824ed1-7237-11e7-a25c-0c4de9d2ab81',
    u'history_id': u'b2486a20bc56b90f',
    u'state': u'new',
    u'workflow_id': u'6fc9fbb81c497f69',
    u'model_class': u'WorkflowInvocation',
    u'id': u'52e496b945151ee8'
}

galaxy_workflow_dict = {
    u'a_galaxy_workflow': u'true',
    u'format-version': u'0.1',
    u'name': u'list test wf',
    u'steps': {
        u'1': {
            u'tool_id': u'refinery_test_LIST-N',
            u'errors': None,
            u'uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
            u'tool_version': u'0.1',
            u'outputs': [
                {u'type': u'txt', u'name': u'output_file'}
            ],
            u'post_job_actions': {
                u'HideDatasetActionoutput_file': {
                    u'output_name': u'output_file',
                    u'action_type': u'HideDatasetAction',
                    u'action_arguments': {}
                }
            },
            u'workflow_outputs': [],
            u'content_id': u'refinery_test_LIST-N', u'input_connections': {
                u'input_file': {u'output_name': u'output', u'id': 0}},
            u'position': {u'top': 302.5, u'left': 814.5},
            u'label': None, u'type': u'tool', u'id': 1,
            u'name': u'Refinery test tool LIST - N'},
        u'0': {u'tool_id': None, u'errors': None,
               u'uuid': u'fa8f08cd-0257-4d4d-9f35-e70bc0e8ca3b',
               u'tool_version': None, u'outputs': [], u'workflow_outputs': [
                {u'output_name': u'output',
                 u'uuid': u'4d34bec2-8124-4de2-be7f-ef4f137b39db',
                 u'label': None}], u'annotation': u'', u'content_id': None,
               u'input_connections': {}, u'inputs': [],
               u'position': {u'top': 301.5, u'left': 391.5},
               u'tool_state': u'{"collection_type": "list"}', u'label': None,
               u'type': u'data_collection_input', u'id': 0,
               u'name': u'Input dataset collection'}},
    u'uuid': u'9e119199-c589-4e42-b358-cd6f046b7e59'
}

galaxy_datasets_list = [
    {u'accessible': True, u'type_id': u'dataset-2b566311765a82ab',
     u'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/'
                   u'files/003/dataset_3030.dat',
     u'resubmitted': False, u'create_time': u'2017-08-16T20:47:56.151531',
     u'creating_job': u'168273a831b1d8c4', u'file_size': 601,
     u'dataset_id': u'8ee788c99983ff96', u'id': u'2b566311765a82ab',
     u'misc_info': u'', u'hda_ldda': u'hda',
     u'download_url': u'/api/histories/67ce804af6ec796b/contents/'
                      u'2b566311765a82ab/display',
     u'state': u'ok', u'display_types': [], u'display_apps': [],
     u'permissions': {u'access': [], u'manage': [u'f597429621d6eb2b']},
     u'type': u'file', u'misc_blurb': u'7 lines',
     u'update_time': u'2017-08-16T20:48:13.307027',
     u'data_type': u'galaxy.datatypes.data.Text', u'tags': [],
     u'deleted': False, u'history_id': u'67ce804af6ec796b', u'meta_files': [],
     u'genome_build': u'?', u'hid': 12, u'visualizations': [{
        u'href': u'/plugins/visualizations/charts/show?dataset_id='
                 u'2b566311765a82ab',
        u'target': u'galaxy_main',
        u'html': u'Charts',
        u'embeddable': False},
        {
            u'href': u'/plugins/visualizations/graphviz/show?dataset_id='
                     u'2b566311765a82ab',
            u'target': u'galaxy_main',
            u'html': u'Graph Visualization',
            u'embeddable': False}],
     u'metadata_data_lines': 7, u'file_ext': u'txt', u'annotation': None,
     u'metadata_dbkey': u'?', u'history_content_type': u'dataset',
     u'name': u'Refinery test tool LIST - N on data 3', u'extension': u'txt',
     u'visible': False,
     u'url': u'/api/histories/67ce804af6ec796b/contents/2b566311765a82ab',
     u'uuid': u'80d6599f-94cb-40e5-a1ca-c9c4b094883b',
     u'model_class': u'HistoryDatasetAssociation', u'rerunnable': True,
     u'purged': False, u'api_type': u'file'},
    {u'accessible': True, u'type_id': u'dataset-61b43c80e544d11d',
     u'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/'
                   u'files/003/dataset_3031.dat',
     u'resubmitted': False, u'create_time': u'2017-08-16T20:47:56.286556',
     u'creating_job': u'b3b7d6d61c1291f5', u'file_size': 406,
     u'dataset_id': u'14bb1cdaa43f5769', u'id': u'61b43c80e544d11d',
     u'misc_info': u'', u'hda_ldda': u'hda',
     u'download_url': u'/api/histories/67ce804af6ec796b/contents/'
                      u'61b43c80e544d11d/display',
     u'state': u'ok', u'display_types': [], u'display_apps': [],
     u'permissions': {u'access': [], u'manage': [u'f597429621d6eb2b']},
     u'type': u'file', u'misc_blurb': u'5 lines',
     u'update_time': u'2017-08-16T20:48:16.588221',
     u'data_type': u'galaxy.datatypes.data.Text', u'tags': [],
     u'deleted': False, u'history_id': u'67ce804af6ec796b', u'meta_files': [],
     u'genome_build': u'?', u'hid': 13, u'visualizations': [{
        u'href': u'/plugins/visualizations/charts/show?dataset_id='
                 u'61b43c80e544d11d',
        u'target': u'galaxy_main',
        u'html': u'Charts',
        u'embeddable': False},
        {
            u'href': u'/plugins/visualizations/graphviz/show?dataset_id='
                     u'61b43c80e544d11d',
            u'target': u'galaxy_main',
            u'html': u'Graph Visualization',
            u'embeddable': False}],
     u'metadata_data_lines': 5, u'file_ext': u'txt', u'annotation': None,
     u'metadata_dbkey': u'?', u'history_content_type': u'dataset',
     u'name': u'Refinery test tool LIST - N on data 2', u'extension': u'txt',
     u'visible': False,
     u'url': u'/api/histories/67ce804af6ec796b/contents/61b43c80e544d11d',
     u'uuid': u'145cf422-2364-402a-a539-c2450939bbb3',
     u'model_class': u'HistoryDatasetAssociation', u'rerunnable': True,
     u'purged': False, u'api_type': u'file'},
    {u'accessible': True, u'type_id': u'dataset-d32aba4ae7b4124a',
     u'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/'
                   u'files/003/dataset_3032.dat',
     u'resubmitted': False, u'create_time': u'2017-08-16T20:47:56.454997',
     u'creating_job': u'1d1dbe75827398cd', u'file_size': 406,
     u'dataset_id': u'953f3a3e2982a4fa', u'id': u'd32aba4ae7b4124a',
     u'misc_info': u'', u'hda_ldda': u'hda',
     u'download_url': u'/api/histories/67ce804af6ec796b/contents/'
                      u'd32aba4ae7b4124a/display',
     u'state': u'ok', u'display_types': [], u'display_apps': [],
     u'permissions': {u'access': [], u'manage': [u'f597429621d6eb2b']},
     u'type': u'file', u'misc_blurb': u'5 lines',
     u'update_time': u'2017-08-16T20:48:17.699327',
     u'data_type': u'galaxy.datatypes.data.Text', u'tags': [],
     u'deleted': False, u'history_id': u'67ce804af6ec796b', u'meta_files': [],
     u'genome_build': u'?', u'hid': 14, u'visualizations': [{
        u'href': u'/plugins/visualizations/charts/show?dataset_id='
                 u'd32aba4ae7b4124a',
        u'target': u'galaxy_main',
        u'html': u'Charts',
        u'embeddable': False},
        {
            u'href': u'/plugins/visualizations/graphviz/show?dataset_id='
                     u'd32aba4ae7b4124a',
            u'target': u'galaxy_main',
            u'html': u'Graph Visualization',
            u'embeddable': False}],
     u'metadata_data_lines': 5, u'file_ext': u'txt', u'annotation': None,
     u'metadata_dbkey': u'?', u'history_content_type': u'dataset',
     u'name': u'Refinery test tool LIST - N on data 1', u'extension': u'txt',
     u'visible': False,
     u'url': u'/api/histories/67ce804af6ec796b/contents/d32aba4ae7b4124a',
     u'uuid': u'80c05e9b-e15d-405d-9a2d-b75d3de89275',
     u'model_class': u'HistoryDatasetAssociation', u'rerunnable': True,
     u'purged': True, u'api_type': u'file'}
]

galaxy_workflow_invocation = {
    u'inputs': {
        u'0': {u'src': u'hdca', u'id': u'f0cc9868bc58f90b',
               u'uuid': u'94f75b27-d8fd-4561-b502-54074d70e106'}},
    u'update_time': u'2017-08-16T20:48:18.727417',
    u'uuid': u'2bb8f78a-82c4-11e7-992b-a0999b05d96b',
    u'history_id': u'67ce804af6ec796b',
    u'state': u'scheduled',
    u'workflow_id': u'4a56addbcc836c23',
    u'steps': [
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.746463',
         u'job_id': u'1d1dbe75827398cd', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'ae7005de11c97062'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.739174',
         u'job_id': u'b3b7d6d61c1291f5', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'617bcf7ae9aa0337'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.738444',
         u'job_id': u'168273a831b1d8c4', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'c98bf69ab64c7797'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.737792',
         u'job_id': u'27ac8094588306e9', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'b5e6772643a2cc7b'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.735134',
         u'job_id': u'e241f85344aeb6fc', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'b7e918a81dac374d'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.732650',
         u'job_id': u'ff7cb2df4a126319', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'184cbf5befa58662'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.731907',
         u'job_id': u'8db99ca4e93606af', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'e78c5d040ed244a7'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.730628',
         u'job_id': u'3c450fc7949be2ab', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'47da84e318bbcf6c'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.729399',
         u'job_id': u'27109eb7ba1afaa3', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'c3309d18d098f8f3'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.713350',
         u'job_id': u'10d654fe587b60a5', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'14a84e50e47f0b49'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.712058',
         u'job_id': u'99b09a72f8d82c30', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'f39a7dd24621e5d2'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.710966',
         u'job_id': u'f21f394283a9e57a', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'03d7bf5391990241'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.709591',
         u'job_id': u'813f3e7f3ba977e7', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'a53f017d8e21033f'},
        {u'workflow_step_label': u'',
         u'update_time': u'2017-08-16T20:47:57.705340',
         u'job_id': u'604a4867e5f95d25', u'state': u'ok',
         u'workflow_step_uuid': u'537a15ff-a8d3-4c1a-8b25-99826bdc91c2',
         u'order_index': 1, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'507bf06c009b95ec', u'id': u'e7a1dda375762889'},
        {u'workflow_step_label': None,
         u'update_time': u'2017-08-16T20:47:52.856650', u'job_id': None,
         u'state': None,
         u'workflow_step_uuid': u'fa8f08cd-0257-4d4d-9f35-e70bc0e8ca3b',
         u'order_index': 0, u'action': None,
         u'model_class': u'WorkflowInvocationStep',
         u'workflow_step_id': u'36b1866d84c358b3',
         u'id': u'ac150490464cd14a'}], u'model_class': u'WorkflowInvocation',
    u'id': u'ddaca2bad6847b13'}

galaxy_history_download_list = [
    {'misc_blurb': u'3 lines',
     'name': u'Refinery test tool LIST - N on data 14',
     'url': u'/api/histories/b3e4e0c76fe49b64/contents/8ee788c99983ff96',
     'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/files'
                  u'/003/dataset_3047.dat',
     'genome_build': u'?', 'visible': False, 'state': u'ok', 'file_size': 211,
     'dataset_id': u'8ee788c99983ff96', 'type': u'txt', 'misc_info': u''},
    {'misc_blurb': u'3 lines',
     'name': u'Refinery test tool LIST - N on data 13',
     'url': u'/api/histories/b3e4e0c76fe49b64/contents/14bb1cdaa43f5769',
     'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/files'
                  u'/003/dataset_3048.dat',
     'genome_build': u'?', 'visible': False, 'state': u'ok', 'file_size': 211,
     'dataset_id': u'14bb1cdaa43f5769', 'type': u'txt', 'misc_info': u''},
    {'misc_blurb': u'9 lines',
     'name': u'Refinery test tool LIST - N on data 12',
     'url': u'/api/histories/b3e4e0c76fe49b64/contents/953f3a3e2982a4fa',
     'file_name': u'/Users/scott/PyCharmProjects/Galaxy/galaxy/database/files'
                  u'/003/dataset_3049.dat',
     'genome_build': u'?', 'visible': False, 'state': u'ok', 'file_size': 714,
     'dataset_id': u'953f3a3e2982a4fa', 'type': u'txt', 'misc_info': u''}]

galaxy_tool_data_mock = {u'inputs': [
    {u'multiple': False, u'help': u'', u'type': u'data', u'argument': None,
     u'label': u'Input file', u'is_dynamic': False,
     u'edam_formats': [u'format_2330'], u'model_class': u'DataToolParameter',
     u'extensions': [u'txt'], u'hidden': False, u'optional': False,
     u'options': {u'hdca': [], u'hda': []}, u'name': u'input_file'},
    {u'help': u'', u'name': u'sleep_time', u'area': False, u'max': None,
     u'min': 0, u'argument': None, u'value': u'0',
     u'label': u'Sleep (seconds)', u'is_dynamic': False, u'type': u'integer',
     u'model_class': u'IntegerToolParameter', u'hidden': False,
     u'optional': False, u'size': None},
    {u'help': u'', u'type': u'boolean', u'truevalue': u'--empty_outfile',
     u'argument': None, u'value': False,
     u'label': u'Produce empty output file', u'is_dynamic': False,
     u'model_class': u'BooleanToolParameter', u'hidden': False,
     u'optional': False, u'falsevalue': u'', u'name': u'empty_outfile'},
    {u'help': u'', u'name': u'p_fail', u'area': False, u'max': 1.0,
     u'min': 0.0, u'argument': None, u'value': u'0.0',
     u'label': u'Probability of failure [0.0, 1.0]', u'is_dynamic': False,
     u'type': u'float', u'model_class': u'FloatToolParameter',
     u'hidden': False, u'optional': False, u'size': None},
    {u'help': u'', u'type': u'boolean', u'truevalue': u'--stdout',
     u'argument': None, u'value': False, u'label': u'Write to standard out',
     u'is_dynamic': False, u'model_class': u'BooleanToolParameter',
     u'hidden': False, u'optional': False, u'falsevalue': u'',
     u'name': u'stdout'},
    {u'help': u'', u'type': u'boolean', u'truevalue': u'--stderr',
     u'argument': None, u'value': False, u'label': u'Write to standard error',
     u'is_dynamic': False, u'model_class': u'BooleanToolParameter',
     u'hidden': False, u'optional': False, u'falsevalue': u'',
     u'name': u'stderr'},
    {u'help': u'', u'name': u'exit_code', u'area': False, u'max': 255,
     u'min': 0, u'argument': None, u'value': u'0',
     u'label': u'Exit code [0, 255]', u'is_dynamic': False,
     u'type': u'integer', u'model_class': u'IntegerToolParameter',
     u'hidden': False, u'optional': False, u'size': None}],
    u'panel_section_name': u'MyTools',
    u'description': u'for testing Galaxy workflow execution from Refinery',
    u'outputs': [
        {u'name': u'output_file', u'format': u'txt',
         u'label': u'${tool.name} on ${on_string}',
         u'edam_format': u'format_2330',
         u'model_class': u'ToolOutput',
         u'hidden': False}], u'labels': [],
    u'panel_section_id': u'mTools', u'version': u'0.1',
    u'model_class': u'Tool',
    u'id': u'refinery_test_LIST-N',
    u'name': u'Refinery test tool LIST - N'}
