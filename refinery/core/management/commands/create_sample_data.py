'''
Created on Jun 28, 2012

@author: nils
'''
from core.models import ExtendedGroup, Project, DataSet, WorkflowEngine
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from galaxy_connector.models import Instance
import simplejson




class Command(BaseCommand):
    help = "Creates some sample data for a Refinery installation:"
    help = "%s - users \n" % help
    help = "%s - groups\n" % help    
    help = "%s - projects\n" % help    
    help = "%s - data sets\n" % help    
    help = "%s - workflow engines\n" % help    

    """
    Name: handle
    Description:
    main program; run the command
    """   
    def handle(self, **options):
        '''
        This function creates test data for Refinery:
        - user accounts:
        - groups:
        - projects:
        - workflow engines:
        - workflows:
        - analyses
        '''
        
        users = [ 
                 { "username": ".nils",
                   "password": "test",
                   "first_name": "Nils",
                   "last_name": "Gehlenborg",
                   "email": "nils@hms.harvard.edu",
                   "affiliation": "Harvard Medical School"
                 },
                 { "username": ".richard",
                   "password": "test",
                   "first_name": "Richard",
                   "last_name": "Park",
                   "email": "rpark@bu.edu",
                   "affiliation": "Boston University"
                 },
                 { "username": ".psalm",
                   "password": "test",
                   "first_name": "Psalm",
                   "last_name": "Haseley",
                   "email": "psm3426@gmail.com",
                   "affiliation": "Brigham & Women's Hospital"
                 },
                 { "username": ".ilya",
                   "password": "test",
                   "first_name": "Ilya",
                   "last_name": "Sytchev",
                   "email": "isytchev@hsph.harvard.edu",
                   "affiliation": "Harvard School of Public Health"
                 },
                 { "username": ".shannan",
                   "password": "test",
                   "first_name": "Shannan",
                   "last_name": "Ho Sui",
                   "email": "shosui@hsph.harvard.edu",
                   "affiliation": "Harvard School of Public Health"
                 }
                ]
        
        user_objects = []
        
        # create user accounts
        for user in users:
            
            # delete if exists
            user_object = User.objects.filter( username__exact=user["username"] )
            if user_object is not None:
                user_object.delete()
        
            user_object = User.objects.create_user( user["username"], email=user["email"], password=user["password"] )
            user_object.first_name = user["first_name"]
            user_object.last_name = user["last_name"]
            user_object.get_profile().affiliation = user["affiliation"]
            user_object.save() 
        
            user_objects.append( user_object )
            
        groups = [ 
                    { "name": ".Park Lab",
                      "members": [ ".nils", ".richard", ".psalm" ]
                    },
                    { "name": ".Hide Lab",
                      "members": [ ".ilya", ".shannan" ]
                    },
                    { "name": ".Refinery Project",
                      "members": [ ".nils", ".shannan", ".richard", ".psalm", ".ilya" ]
                    },
                 ]
        
        group_objects = []
    
        # create groups
        for group in groups:
            
            # delete if exists
            try:
                group_object = ExtendedGroup.objects.get( name__exact=group["name"] )            
                if group_object.is_managed():
                    print( group_object.manager_group )
                    group_object.manager_group.delete()
                else:
                    group_object.delete()
            except:
                pass
    
            group_object = ExtendedGroup.objects.create( name=group["name"] )
            #manager_group_object = ExtendedGroup.objects.create( name=str( group["name"] + " Managers" ) )        
            #group_object.manager_group = manager_group_object
            #group_object.save()
    
            # Add users to group
            for username in group["members"]:
                user_object = User.objects.get( username__exact=username )
                user_object.groups.add( group_object )
            
            # Add first two members of each group to the manager group    
            User.objects.get( username__exact=group["members"][0] ).groups.add( group_object.manager_group )
            User.objects.get( username__exact=group["members"][1] ).groups.add( group_object.manager_group )
                        
            group_objects.append( group_object )
            
        for group in group_objects:
            print( str( group ) )
                        
        public_members = [ ".nils", ".richard", ".psalm", ".ilya", ".shannan" ]    
        for username in public_members:
            user_object = User.objects.get( username__exact=username )
            user_object.groups.add( ExtendedGroup.objects.public_group() )
            
        for user in user_objects:
            print( str( user ) )            
            
        """
        # disk quotas (for each user) 
        for user_object in user_objects:
                    
            ## PRIVATE PROJECT
            quota_name = user_object.first_name + "\'s Quota"
            quota_summary = "Initial user quota."
            
            # delete if exists
            quota_object = DiskQuota.objects.filter( name__exact=quota_name )
            if quota_object is not None:
                quota_object.delete()
        
            quota_object = DiskQuota.objects.create( name=quota_name, summary=quota_summary, maximum=20*1024*1024*1024, current=20*1024*1024*1024 )
            quota_object.set_owner( user_object )
    
        
        # disk quotas (for each user) 
        for group_object in group_objects:
                    
            ## PRIVATE PROJECT
            quota_name = group_object.name + "\'s Quota"
            quota_summary = "Initial group quota."
            
            # delete if exists
            quota_object = DiskQuota.objects.filter( name__exact=quota_name )
            if quota_object is not None:
                quota_object.delete()
        
            quota_object = DiskQuota.objects.create( name=quota_name, summary=quota_summary, maximum=100*1024*1024*1024, current=100*1024*1024*1024 )
            quota_object.set_manager_group( group_object.manager_group )
            quota_object.share( group_object, readonly=False )
        """
    
    
        project_objects = []
    
        # create projects (for each user: private, lab shared read/write, project group shared read-only, public shared) 
        for user_object in user_objects:
                    
            ## PRIVATE PROJECT
            project_name = user_object.first_name + "\'s Private Project"
            project_summary = "A project that is only visible to " + user_object.first_name + "."
            
            # delete if exists
            project_object = Project.objects.filter( name__exact=project_name )
            if project_object is not None:
                project_object.delete()
        
            project_object = Project.objects.create( name=project_name, summary=project_summary )
            project_object.set_owner( user_object )
            
            project_objects.append( project_object )
            
        
            ## PUBLIC PROJECT
            project_name = user_object.first_name + "\'s Public Project" 
            project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading with the general public."
            
            # delete if exists
            project_object = Project.objects.filter( name__exact=project_name, summary=project_summary )
            if project_object is not None:
                project_object.delete()
        
            project_object = Project.objects.create( name=project_name, summary=project_summary )
            project_object.set_owner( user_object )
            group_object = ExtendedGroup.objects.public_group()
            project_object.share( group_object )
        
            project_objects.append( project_object )
                
        
            ## PROJECT GROUP READ-ONLY PROJECT
            project_name = user_object.first_name + "\'s Refinery Project" 
            project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading with the \'Refinery Project\' group."
            
            # delete if exists
            project_object = Project.objects.filter( name__exact=project_name )
            if project_object is not None:
                project_object.delete()
        
            project_object = Project.objects.create( name=project_name, summary=project_summary )
            project_object.set_owner( user_object )
            group_object = ExtendedGroup.objects.get( name__exact=".Refinery Project" )
            project_object.share( group_object )
        
            project_objects.append( project_object )
        
        
            ## LAB READ/WRITE PROJECT
            project_name = user_object.first_name + "\'s Lab Project" 
            project_summary = "A project that is owned by " + user_object.first_name + " and shared for reading and writing their lab group."
            
            # delete if exists
            project_object = Project.objects.filter( name__exact=project_name )
            if project_object is not None:
                project_object.delete()
        
            project_object = Project.objects.create( name=project_name, summary=project_summary )
            project_object.set_owner( user_object )
            group_object = user_object.groups.get( name__endswith="Lab" )
            project_object.share( group_object, readonly=False )
            project_objects.append( project_object )
    
        for project in project_objects:
            print( str( project ) )            
            
        data_set_objects = []
    
        # create data_sets (for each user: private, lab shared read/write, data_set group shared read-only, public shared) 
        for user_object in user_objects:
            
            ## PRIVATE data_set
            data_set_name = user_object.first_name + "\'s Private Data Set"
            data_set_summary = "A data set that is only visible to " + user_object.first_name + "."
            
            # delete if exists
            data_set_object = DataSet.objects.filter( name__exact=data_set_name )
            if data_set_object is not None:
                data_set_object.delete()
    
            data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
            data_set_object.set_owner( user_object )
            data_set_objects.append( data_set_object )
            
    
            ## PUBLIC data_set
            data_set_name = user_object.first_name + "\'s Public Data Set" 
            data_set_summary = "A data set that is owned by " + user_object.first_name + " and shared for reading with the general public."
            
            # delete if exists
            data_set_object = DataSet.objects.filter( name__exact=data_set_name, summary=data_set_summary )
            if data_set_object is not None:
                data_set_object.delete()
    
            data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
            data_set_object.set_owner( user_object )
            group_object = ExtendedGroup.objects.public_group()
            data_set_object.share( group_object )
            data_set_objects.append( data_set_object )
                
    
            ## data_set GROUP READ-ONLY data_set
            data_set_name = user_object.first_name + "\'s Refinery Data Set" 
            data_set_summary = "A data_set that is owned by " + user_object.first_name + " and shared for reading with the \'Refinery Project\' group."
            
            # delete if exists
            data_set_object = DataSet.objects.filter( name__exact=data_set_name )
            if data_set_object is not None:
                data_set_object.delete()
    
            data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
            data_set_object.set_owner( user_object )
            group_object = ExtendedGroup.objects.get( name__exact=".Refinery Project" )
            data_set_object.share( group_object )
            data_set_objects.append( data_set_object )
    
        
            ## LAB READ/WRITE data_set
            data_set_name = user_object.first_name + "\'s Lab Data Set"
            data_set_summary = "A data set that is owned by " + user_object.first_name + " and shared for reading and writing their lab group."
            
            # delete if exists
            data_set_object = DataSet.objects.filter( name__exact=data_set_name )
            if data_set_object is not None:
                data_set_object.delete()
    
            data_set_object = DataSet.objects.create( name=data_set_name, summary=data_set_summary )
            data_set_object.set_owner( user_object )
            group_object = user_object.groups.get( name__endswith="Lab" )
            data_set_object.share( group_object, readonly=False )
            data_set_objects.append( data_set_object )
        
        for data_set in data_set_objects:
            print(str(data_set))
            
        workflow_engine_objects = []
        
        WorkflowEngine.objects.all().delete()
        
        for instance in Instance.objects.all():
            workflow_engine_object = WorkflowEngine.objects.create( instance=instance, name=instance.description, summary=instance.base_url + " " + instance.api_key )
            # TODO: introduce group managers and assign ownership to them        
            workflow_engine_object.set_manager_group( ExtendedGroup.objects.public_group().manager_group )
            #workflow_engine_object.share( ExtendedGroup.objects.public_group() )
                    
            workflow_engine_objects.append( workflow_engine_object )
        
        for workflow_engine in workflow_engine_objects:
            print(str(workflow_engine))
        