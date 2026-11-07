from rest_framework import status
from rest_framework.exceptions import APIException


class InvalidOrExpiredToken(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This link is invalid or has expired. Request a new one."
    default_code = "invalid_token"
