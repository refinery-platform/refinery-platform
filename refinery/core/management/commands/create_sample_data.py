'''
Created on Jun 28, 2012

@author: nils
'''
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand

from core.models import ExtendedGroup


class Command(BaseCommand):
    help = "Creates some sample data for a %s installation:" % \
           Site.objects.get_current().name
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
        """create test data for Refinery:
        - user accounts
        - groups
        - projects
        - workflow engines
        - workflows
        - analyses
        """
        users = [
            {"username": ".nils",
             "password": "test",
             "first_name": "Nils",
             "last_name": "Gehlenborg",
             "email": "nils@hms.harvard.edu",
             "affiliation": "Harvard Medical School"
             },
            {"username": ".richard",
             "password": "test",
             "first_name": "Richard",
             "last_name": "Park",
             "email": "rpark@bu.edu",
             "affiliation": "Boston University"
             },
            {"username": ".psalm",
             "password": "test",
             "first_name": "Psalm",
             "last_name": "Haseley",
             "email": "psm3426@gmail.com",
             "affiliation": "Brigham & Women's Hospital"
             },
            {"username": ".ilya",
             "password": "test",
             "first_name": "Ilya",
             "last_name": "Sytchev",
             "email": "isytchev@hsph.harvard.edu",
             "affiliation": "Harvard School of Public Health"
             },
            {"username": ".shannan",
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
            user_object = User.objects.filter(username__exact=user["username"])
            if user_object is not None:
                user_object.delete()

            user_object = User.objects.create_user(
                user["username"], email=user["email"],
                password=user["password"])
            user_object.first_name = user["first_name"]
            user_object.last_name = user["last_name"]
            user_object.get_profile().affiliation = user["affiliation"]
            user_object.save()

            user_objects.append(user_object)
        groups = [
                    {"name": ".Park Lab",
                     "members": [".nils", ".richard", ".psalm"]},
                    {"name": ".Hide Lab",
                     "members": [".ilya", ".shannan"]},
                    {"name": ".Refinery Project",
                     "members":
                         [".nils", ".shannan", ".richard", ".psalm", ".ilya"]},
                 ]
        group_objects = []
        # create groups
        for group in groups:
            # delete if exists
            try:
                group_object = ExtendedGroup.objects.get(
                    name__exact=group["name"])
                if group_object.is_managed():
                    print(group_object.manager_group)
                    group_object.manager_group.delete()
                else:
                    group_object.delete()
            except:
                pass
            group_object = ExtendedGroup.objects.create(name=group["name"])
            # Add users to group
            for username in group["members"]:
                user_object = User.objects.get(username__exact=username)
                user_object.groups.add(group_object)
            # Add first two members of each group to the manager group
            User.objects.get(username__exact=group["members"][0]).groups.add(
                group_object.manager_group)
            User.objects.get(username__exact=group["members"][1]).groups.add(
                group_object.manager_group)
            group_objects.append(group_object)

        for group in group_objects:
            print(str(group))
        for user in user_objects:
            print(str(user))
