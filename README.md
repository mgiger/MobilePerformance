# MobilePerformance

MobilePerformance/
	manage.py			- Ignore
	performance/
		__init__.py		- Ignore
		settings.py		- Ignore
		urls.py			- This is where you can add new URL handlers to hook up to functions in vote/views.py
		wsgi.py			- Ignore
	README.md				- This file
	setup.sh			- List of commands that will configure the server
	vote/
		__init__.py		- Ignore
		admin.py		- Ignore
		apps.py			- Ignore
		migrations/*	- Ignore
		models.py		- File to define automatic data model creation
		tests.py		- Ignore
		views.py		- Where you put your URL handling code


All you will need to do is to modify 3 files:
performance/performance/urls.py (docs: https://docs.djangoproject.com/en/1.9/topics/http/urls/)
performance/mobile/views.py (docs: https://docs.djangoproject.com/en/1.9/ref/request-response/)
performance/mobile/models.py (docs: https://docs.djangoproject.com/en/1.9/topics/db/models/)


If you want to change your data models, after you upload, run the command (in base MobilePerformance dir):
python manage.py makemigrations
python manage.py migrate
python manage.py runserver

You can then use your local browser to do the development work at http://127.0.0.1:8000/
