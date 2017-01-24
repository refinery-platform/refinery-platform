'''
Created on Apr 21, 2012

@author: nils
'''

import json
import logging

from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template.context import RequestContext

import file_server.tdf_file as tdf_module
import file_server.models as models
from file_store.models import FileStoreItem
import file_store

logger = logging.getLogger(__name__)


def index(request):
    file_object = file_store.models.get_file_object(
        "/Users/isytchev/Sites/tdf/"
        "TCGA-AG-4007-01A-01D-1115-02_101122_SN177_0123_B20APUABXX_s_5.rg"
        ".sorted.chr21.bam.tdf")
    tdf_file = tdf_module.TDFFile(file_object)
    tdf_file.cache()

    for track_name in tdf_file.get_track_names():
        logger.info(track_name)

    for data_set_name in tdf_file.get_data_set_names():
        logger.info(data_set_name)
        window_function = ""
        if len(data_set_name.split("/")) == 4:
            window_function = data_set_name.split("/")[3]
        data_set = tdf_file.get_data_set(data_set_name.split("/")[1],
                                         data_set_name.split("/")[2],
                                         window_function)
        data_set.read()
        logger.info("Tile Count: " + str(len(data_set.tile_index)))
        logger.info("Tile Width: " + str(data_set.tile_width))

    logger.info(data_set)

    tile = data_set.get_tile(0)
    logger.info(tile)

    tile = data_set.get_tile(1)
    logger.info(tile)

    tile = data_set.get_tile(2)
    logger.info(tile)

    tile = data_set.get_tile(3)
    logger.info(tile)

    tile = data_set.get_tile(4)
    logger.info(tile)

    tile = data_set.get_tile(5)
    logger.info(tile)

    tile = data_set.get_tile(6)
    logger.info(tile)

    tile = data_set.get_tile(7)
    logger.info(tile)

    profile = tdf_file.get_profile("chr21", "z0", ["mean"],
                                   start_location=13591070,
                                   end_location=14845362)

    file_object.close()

    return HttpResponse(json.dumps(profile), content_type='application/json')


def _get_cache(session, uuid):
    if "file_server" not in session:
        session["file_server"] = {}

    if "tdf" not in session["file_server"]:
        session["file_server"]["tdf"] = {}

    if uuid not in session["file_server"]["tdf"]:
        session["file_server"]["tdf"][uuid] = {}

    if "data_sets" not in session["file_server"]["tdf"][uuid]:
        session["file_server"]["tdf"][uuid]["data_sets"] = {}

    return session["file_server"]["tdf"][uuid]


def _is_cached_tdf_data_set(session, uuid, data_set_name):
    cache = _get_cache(session, uuid)
    return data_set_name in cache["data_sets"]


def _cache_tdf_data_set(session, uuid, data_set_name, data_set):
    cache = _get_cache(session, uuid)

    if not _is_cached_tdf_data_set(session, uuid, data_set_name):
        cache["data_sets"][data_set_name] = {}

    cache["data_sets"][data_set_name] = data_set


def _get_tdf_data_set_from_cache(session, uuid, data_set_name):
    cache = _get_cache(session, uuid)
    return cache["data_sets"][data_set_name]


def _is_cached_tdf_data_set_information(session, uuid):
    cache = _get_cache(session, uuid)
    return "data_set_information" in cache


def _cache_tdf_data_set_information(session, uuid, data_set_name_components,
                                    data_set_information):
    # cache hierarchy:
    # file_server / type=tdf / uuid / sequence / zoom / window_function =
    # data set

    cache = _get_cache(session, uuid)
    if not _is_cached_tdf_data_set_information(session, uuid):
        cache["data_set_information"] = {}

    components = data_set_name_components

    if components["sequence_name"] not in cache["data_set_information"]:
        cache["data_set_information"][components["sequence_name"]] = {}
    if components["zoom_level"] not in cache["data_set_information"][
            components["sequence_name"]]:
        cache["data_set_information"][components["sequence_name"]][
            components["zoom_level"]] = {}

    cache["data_set_information"][components["sequence_name"]][
        components["zoom_level"]][
        components["window_function"]] = data_set_information


def _get_tdf_data_set_information_from_cache(session, uuid):
    cache = _get_cache(session, uuid)
    return cache["data_set_information"]


def _is_cached_tdf_file(session, uuid):
    cache = _get_cache(session, uuid)
    return "file" in cache


def _cache_tdf_file(session, uuid, tdf):
    cache = _get_cache(session, uuid)

    if not _is_cached_tdf_file(session, uuid):
        cache["file"] = {}

    cache["file"] = tdf


def _get_tdf_file_from_cache(session, uuid):
    cache = _get_cache(session, uuid)
    return cache["file"]


def cache_tdf(request, uuid, refresh=False):
    try:
        file_store_item = FileStoreItem.objects.get(uuid=uuid)
    except (FileStoreItem.DoesNotExist,
            FileStoreItem.MultipleObjectsReturned) as e:
        logger.error("Couldn't properly fetch FileStoreItem: %s", e)
    else:
        if not _is_cached_tdf_file(request.session, uuid):
            logger.debug("Caching file: %s ...", uuid)
            tdf = tdf_module.TDFFile(file_store_item.get_file_object())
            tdf.cache()
            _cache_tdf_file(request.session, uuid, tdf)
        else:
            logger.debug("Retrieved file: %s ...", uuid)
            tdf = _get_tdf_file_from_cache(request.session, uuid)

        if not _is_cached_tdf_data_set_information(request.session,
                                                   uuid) or refresh:
            logger.debug("Caching data set information: %s ...", uuid)

            for data_set_name in tdf.get_data_set_names():
                # decompose data set name
                components = tdf.decompose_data_set_name(data_set_name)
                data_set = tdf.get_data_set(components["sequence_name"],
                                            components["zoom_level"],
                                            components["window_function"])
                data_set_information = {"data_set_name": data_set_name,
                                        "tile_width": data_set.tile_width,
                                        "tile_count": str(
                                            len(data_set.tile_index))}

                _cache_tdf_data_set_information(
                    request.session, uuid, components, data_set_information)
        else:
            logger.debug("%s data set information is cached and refresh not "
                         "requested", uuid)

        return HttpResponse(json.dumps(
            _get_tdf_data_set_information_from_cache(request.session, uuid),
            sort_keys=True, indent=4), content_type='application/json')


def get_tdf_profile(request, uuid, sequence_name, zoom_level, start_location,
                    end_location):
    window_function = "mean"

    # TODO: run asynchronously and return requested profile as a call back
    cache_tdf(request, uuid)

    if start_location < 1:
        start_location = 1

    try:
        file_store_item = FileStoreItem.objects.get(uuid=uuid)
    except(FileStoreItem.DoesNotExist,
           FileStoreItem.MultipleObjectsReturned) as e:
        logger.error("Couldn't properly fetch FileStoreItem: %s", e)
    else:

        data_set_name = _get_tdf_data_set_information_from_cache(
            request.session, uuid
        )[sequence_name][zoom_level][window_function]["data_set_name"]

        if _is_cached_tdf_data_set(request.session, uuid, data_set_name):
            logger.debug("Retrieving TDF data set %s ...", data_set_name)
            data_set = _get_tdf_data_set_from_cache(request.session, uuid,
                                                    data_set_name)
        else:
            logger.debug("Caching TDF data set %s ...", data_set_name)
            tdf_file = _get_tdf_file_from_cache(request.session, uuid)
            data_set = tdf_file.get_data_set(sequence_name, zoom_level, "mean")
            data_set.read()
            _cache_tdf_data_set(request.session, uuid, data_set_name, data_set)

        with file_store_item.get_file_object() as file_object:
            profile = tdf_module.get_profile_from_file(data_set,
                                                       int(start_location),
                                                       int(end_location),
                                                       file_object)

        print("Profile Length: " + str(len(profile)))

        return HttpResponse(
            json.dumps(profile), content_type='application/json')


def get_zoom_levels(request, uuid, sequence_name):
    # TODO: support window functions, include raw
    cache_tdf(request, uuid)
    window_function = "mean"

    data_set_information = _get_tdf_data_set_information_from_cache(
        request.session, uuid)
    sorted_zoom_levels = sorted(data_set_information[sequence_name])

    if sorted_zoom_levels[0] == "raw":
        del sorted_zoom_levels[0]  # assuming this is "raw"

    zoom_level_ranges = {}

    for i in range(len(sorted_zoom_levels)):

        zoom_level = sorted_zoom_levels[i]
        upper_bound = int(
            data_set_information[sequence_name][zoom_level][window_function][
                "tile_width"] / 700.0) + 1

        if i < len(sorted_zoom_levels) - 1:
            next_zoom_level = sorted_zoom_levels[i + 1]
            lower_bound = int(
                data_set_information[sequence_name][next_zoom_level][
                    window_function]["tile_width"] / 700.0) + 1
        else:
            lower_bound = 0

        zoom_level_ranges[zoom_level] = [lower_bound, upper_bound]

    return HttpResponse(
        json.dumps(zoom_level_ranges, sort_keys=True, indent=4),
        content_type='application/json')


def profile_viewer(request, uuid, sequence_name, start_location, end_location):
    uri = request.build_absolute_uri()
    hostname = uri.split(request.get_full_path())[0]
    return render_to_response('file_server/profile_viewer.html',
                              {"hostname": hostname, "uuid": uuid,
                               "sequence_name": sequence_name,
                               "start_location": start_location,
                               "end_location": end_location},
                              context_instance=RequestContext(request))


def profile_viewer2(request, uuid, sequence_name, start_location,
                    end_location):
    """
    Rpark test viewer for viewing multiple profiles
    """
    uri = request.build_absolute_uri()
    hostname = uri.split(request.get_full_path())[0]

    return render_to_response('file_server/profile_viewer2.html',
                              {"hostname": hostname, "uuid": uuid,
                               "sequence_name": sequence_name,
                               "start_location": start_location,
                               "end_location": end_location},
                              context_instance=RequestContext(request))


def profile(request):
    '''Calculates and returns a profile.

    :returns: JSON -- profile representation

    '''
    # test URL params: chr21, 13591070, 14845362, z0

    if 'uuid' in request.GET:
        uuid = request.GET['uuid']
    else:
        msg = "Please provide a UUID"
        logger.error(msg)
        return HttpResponse(msg)

    if 'seq' in request.GET:
        seq = request.GET['seq']
    else:
        msg = "Please provide a sequence name"
        logger.error(msg)
        return HttpResponse(msg)

    if 'zoom' in request.GET:
        zoom = request.GET['zoom']
    else:
        msg = "Please provide zoom level"
        logger.error(msg)
        return HttpResponse(msg)

    if 'start' in request.GET:
        start = int(request.GET['start'])
    else:
        msg = "Please provide a start position"
        logger.error(msg)
        return HttpResponse(msg)

    if 'end' in request.GET:
        end = int(request.GET['end'])
    else:
        msg = "Please provide an end position"
        logger.error(msg)
        return HttpResponse(msg)

    item = models.get(uuid)

    try:
        profile = item.get_profile(seq, zoom, ["mean"], start, end)
    except AttributeError as e:
        return HttpResponse(e.message)

    return HttpResponse(profile, content_type='application/json')
