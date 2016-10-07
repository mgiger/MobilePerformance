"""performance URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
import mobile.views

urlpatterns = [
    url(r'^report_metrics', mobile.views.report_metrics),
	
	url(r'^test_run_data/(?P<device_name>.+)/(?P<test_id>\d+)/$', mobile.views.test_run_data),
	
	url(r'^device/(?P<device_name>.+)/(?P<test_id>\d+)/$', mobile.views.device_test_run),
	url(r'^device/(?P<device_name>.+)/$', mobile.views.device),
	url(r'^device/$', mobile.views.devices),
]
