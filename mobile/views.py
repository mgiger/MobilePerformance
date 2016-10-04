from django.http import HttpResponse
from django.shortcuts import render, render_to_response
from django.views.decorators.csrf import csrf_exempt
from models import PerformanceMetrics, Device
import json, datetime

# Path to a file:
# import performance.settings
# os.path.join(settings.BASE_DIR, 'db.sqlite3')

@csrf_exempt
def report_metrics(request):
	
	# default failure
	response = HttpResponse("{success:false}", content_type='application/json')
		
	if request.method == 'POST':
		data = json.loads(request.body)
		device_name = data["log"]["hardware"]["deviceName"]
		test_time = data["log"]["session"]["reportTime"]
		
		try:
			device = Device.objects.get(pk=device_name)
		except Device.DoesNotExist:  # catch the DoesNotExist error
			device = Device(name=device_name)
		device.last_update = test_time
		device.save()
		
		metric = PerformanceMetrics.objects.create(device=device, time=test_time, data=request.body)
		metric.save()
		
		response = HttpResponse('{success:true}', content_type='application/json')
		
	return response
	
@csrf_exempt
def devices(request):
	devices = Device.objects.all()
	return render_to_response('devices.html', context = { 'device_list': devices })
	
@csrf_exempt
def device(request, device_name):
	try:
		device = Device.objects.get(pk=device_name)
	except Device.DoesNotExist:  # catch the DoesNotExist error
		return render_to_response('error.html')
		
	try:
		runs = PerformanceMetrics.objects.filter(device=device).order_by('-time')
	except PerformanceMetrics.DoesNotExist:  # catch the DoesNotExist error
		return render_to_response('error.html')
	
	return render_to_response("device_metrics.html", context = { 'device': device, 'runs': runs })

@csrf_exempt
def device_test_run(request, device_name, test_id):
	try:
		device = Device.objects.get(pk=device_name)
	except Device.DoesNotExist:  # catch the DoesNotExist error
		return render_to_response('error.html')
		
	try:
		metrics = PerformanceMetrics.objects.get(pk=test_id)
	except PerformanceMetrics.DoesNotExist:  # catch the DoesNotExist error
		return render_to_response('error.html')
	
	data = json.loads(metrics.data)
	hardwareData = data["log"]["hardware"]
	hardwareData["modelName"] = Device.modelNames[data["log"]["hardware"]["deviceType"]]
	return render_to_response('device_test_run.html', context = { 'device':device, 'metrics': metrics, 'jsonData':data, 'hardware':hardwareData })
