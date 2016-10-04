from __future__ import unicode_literals

from django.db import models

class Device(models.Model):
	app_label = 'devices'
	name = models.CharField(max_length=128, primary_key=True)
	last_update = models.DateTimeField(auto_now=True)
	modelNames = {
		'x86_64':'iPhone Simulator',
		'iPhone1,1':'iPhone 1G',
		'iPhone1,2':'iPhone 3G',
		'iPhone2,1':'iPhone 3GS',
		'iPhone3,1':'iPhone 4',
		'iPhone3,3':'iPhone 4 (Verizon)',
		'iPhone4,1':'iPhone 4S',
		'iPhone5,1':'iPhone 5 (GSM)',
		'iPhone5,2':'iPhone 5 (GSM+CDMA)',
		'iPhone5,3':'iPhone 5C (GSM)',
		'iPhone5,4':'iPhone 5C (Global)',
		'iPhone6,1':'iPhone 5S (GSM)',
		'iPhone6,2':'iPhone 5S (Global)',
		'iPhone7,1':'iPhone 6 Plus',
		'iPhone7,2':'iPhone 6',
		'iPhone8,1':'iPhone 7 Plus',
		'iPhone8,2':'iPhone 7',
		'iPod1,1':'iPod Touch 1G',
		'iPod2,1':'iPod Touch 2G',
		'iPod3,1':'iPod Touch 3G',
		'iPod4,1':'iPod Touch 4G',
		'iPod5,1':'iPod Touch 5G',
		'iPad1,1':'iPad 1',
		'iPad2,1':'iPad 2 (WiFi)',
		'iPad2,2':'iPad 2 (GSM)',
		'iPad2,3':'iPad 2 (CDMA)',
		'iPad2,4':'iPad 2 (WiFi)',
		'iPad2,5':'iPad Mini (WiFi)',
		'iPad2,6':'iPad Mini (GSM)',
		'iPad2,7':'iPad Mini (GSM+CDMA)',
		'iPad3,1':'iPad 3 (WiFi)',
		'iPad3,2':'iPad 3 (GSM+CDMA)',
		'iPad3,3':'iPad 3 (GSM)',
		'iPad3,4':'iPad 4 (WiFi)',
		'iPad3,5':'iPad 4 (GSM)',
		'iPad3,6':'iPad 4 (GSM+CDMA)',
		'iPad4,1':'iPad Air (WiFi)',
		'iPad4,2':'iPad Air (GSM+CDMA)',
		'iPad4,4':'iPad Mini Retina (WiFi)',
		'iPad4,5':'iPad Mini Retina (GSM+CDMA)'
	  }
	
class PerformanceMetrics(models.Model):
	app_label = 'metrics'
	test_id = models.AutoField(primary_key=True)
	device = models.ForeignKey('Device', on_delete=models.CASCADE)
	time = models.DateTimeField(auto_now=True)
	data = models.TextField()

