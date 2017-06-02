'''
Created on November 29, 2012

@author: Psalm
'''
import sys
from optparse import make_option

from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError

from core.models import ExtendedGroup


class Command(BaseCommand):
    help = "Creates test users for a %s installation\n" % \
           Site.objects.get_current().name
    help += ("Usage:\npython manage.py create_sample_users <number of users> "
             "[--prefix <prefix for usernames> --password <sample password> "
             "--groups]\n\nIf --prefix and --password are not provided the "
             "default values will be 'testuser' and 'samplepass,' "
             "respectively.\n--groups will create a group for each user and "
             "add the user to the group as well as making the user a manager "
             "for that group. Group names are currently set to be "
             "'group_<username>'.")
    option_list = BaseCommand.option_list + (
        make_option('--prefix',
                    action='store',
                    type='string',
                    default='testuser'
                    ),
        make_option('--password',
                    action='store',
                    type='string',
                    default='samplepass'
                    ),
        make_option('--groups',
                    action='store_true',
                    default=False
                    ),
    )
    """ Name: handle
    Description: main program; run the command
    """
    def handle(self, *args, **options):
        # set variables
        try:
            num_users = int(args[0])
        except:
            raise CommandError(self.help)
        prefix = options['prefix']
        password = options['password']
        # create usernames
        users = list()
        for num in xrange(num_users):
            name = "%s%d" % (prefix, num)
            users.append({
                'username': name,
                'password': password,
                'email': "%s@test.com" % name,
                'first_name': name
            })
        # create users
        for user in users:
            # delete if exists
            user_object = User.objects.filter(username__exact=user["username"])
            if user_object is not None:
                user_object.delete()

            user_object = User.objects.create_user(
                user["username"], email=user["email"],
                password=user["password"])
            user_object.first_name = user["first_name"]
            user_object.save()
            sys.stdout.write('Created User: {}'.format(user_object))
            # create group if you should
            if options['groups']:
                group_name = "group_%s" % user['username']
                try:
                    group_object = ExtendedGroup.objects.get(
                        name__exact=group_name)
                    if group_object.is_managed():
                        print(group_object.manager_group)
                        group_object.manager_group.delete()
                    else:
                        group_object.delete()
                except:
                    pass
                group_object = ExtendedGroup.objects.create(name=group_name)
                user_object.groups.add(group_object)
                user_object.groups.add(group_object.manager_group)
                sys.stdout.write('Created Group {} for User {}'.format(
                    group_object, user_object))
