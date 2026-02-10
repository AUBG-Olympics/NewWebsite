"""
Entry point for cPanel/Passenger. Passenger looks for this file and the name 'application'.
Uses the WSGI callable from wsgi.py (do not use 'wsgi:application' here - that is Apache config syntax).
"""
from wsgi import application
