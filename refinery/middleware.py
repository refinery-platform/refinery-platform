class JsonAsHTML(object):
    """
    View a JSON response in your browser as HTML if the request has a `debug`
    query parameter
    E.g. http://192.168.50.50:8000/api/v1/data_sets/?format=json&debug

    Useful for viewing stats using Django Debug Toolbar

    This middleware should be place AFTER Django Debug Toolbar middleware
    """

    def process_response(self, request, response):

        # not for production or production like environment
        if request.GET.get('debug') != '':
            return response

        # do nothing for actual ajax requests
        if request.is_ajax():
            return response

        # only do something if this is a json response
        if "application/json" in response['Content-Type'].lower():
            title = "JSON as HTML Middleware for: %s" % request.get_full_path()
            response.content = (
                "<html><head><title>{title}</title></head><body><pre>{body}"
                "</pre></body></html>".format(
                    title=title,
                    body=response.content
                )
            )
            response['Content-Type'] = 'text/html'
        return response
