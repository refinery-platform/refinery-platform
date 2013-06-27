class ConnectionError(RuntimeError):
    '''No connection to Galaxy

    '''
    def __init__(self):
        super(ConnectionError, self).__init__(
            "Could not connect to Galaxy instance")

class ResourceError(RuntimeError):
    '''HTTP status code 400
    returned for invalid workflow and history IDs, and Galaxy misconfiguration?

    '''
    def __init__(self):
        super(ResourceError, self).__init__("Galaxy resource error")

class AuthError(RuntimeError):
    '''HTTP status code 403

    '''
    def __init__(self):
        super(AuthError, self).__init__("Incorrect Galaxy API key")

class ResourceNameError(RuntimeError):
    '''HTTP status code 404

    '''
    def __init__(self):
        super(ResourceNameError, self).__init__("Galaxy URL not found")

class DatasetError(RuntimeError):
    '''HTTP status code 416 (returned when using an invalid dataset IDs)

    '''
    def __init__(self):
        super(DatasetError, self).__init__("Invalid Galaxy dataset ID")

class ServerError(RuntimeError):
    '''HTTP status code 500

    '''
    def __init__(self):
        super(ServerError, self).__init__("Miscellaneous Galaxy error")

class UnknownResponseError(RuntimeError):
    '''Any HTTP status code except 2xx, 403, 404, 416 or 500

    '''
    def __init__(self):
        super(UnknownResponseError, self).__init__(
            "Unknown response code from Galaxy instance")

class TimeoutError(RuntimeError):
    '''Galaxy connection timed out

    '''
    def __init__(self):
        super(TimeoutError, self).__init__(
            "Galaxy instance is taking too long to respond")

class InvalidResponseError(RuntimeError):
    '''Received invalid JSON response
    Galaxy sometimes reports errors in the body of the HTTP 200 response
    which is not possible to parse as JSON

    '''
    def __init__(self):
        super(InvalidResponseError, self).__init__(
            "Invalid response from Galaxy instance")

class MalformedResourceID(RuntimeError):
    '''Workflow, history or history content ID is None or not a string

    '''
    def __init__(self, resource_id):
        super(MalformedResourceID, self).__init__(
            "Malformed Galaxy resource id '{}' specified".format(resource_id))

class TestError(Exception):
    def __init__(self, msg="TestError exception"):
        self.message = msg
        super(TestError, self).__init__(msg)
