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
