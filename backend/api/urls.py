
from .views import GetWaypointView

from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse


urlpatterns = [
    path('generate-waypoint/', GetWaypointView.as_view()),
]