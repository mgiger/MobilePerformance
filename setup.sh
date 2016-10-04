#!/bin/bash
#  
#  mockqate server instance configuration script
#
#  Created by Matt Giger on 4/5/16.
#  Copyright 2016 eBay Inc. All rights reserved.
#

# reset the bad apt-get sources (no longer available in front of the firewall)
sudo cat <<EOF > /etc/apt/sources.list
deb [arch=amd64] http://us.archive.ubuntu.com/ubuntu/ trusty main universe
deb [arch=amd64] http://us.archive.ubuntu.com/ubuntu/ trusty-updates main universe
EOF

sudo add-apt-repository -y ppa:nginx/stable
sudo apt-get -m update
#sudo apt-get -y upgrade

sudo apt-get -y install python-pip
sudo pip install django pytz

sudo apt-get -y --no-upgrade install git zip unzip sqlite3 ntp sysv-rc-conf

sudo apt-get -y --no-upgrade install nginx uwsgi uwsgi-plugin-python mysql-server mysql-client memcached
sudo sysv-rc-conf nginx on
sudo sysv-rc-conf uwsgi on
sudo sysv-rc-conf mysql on
sudo sysv-rc-conf memcache on

mysql -u root -e "CREATE DATABASE MobilePerformance CHARACTER SET utf8"
mysql -u root -e "GRANT ALL on MobilePerformance.* to 'stack'@'localhost'"
mysql -u root -e "GRANT ALL on MobilePerformance.* to 'www-data'@'localhost'"
mysql -u root -e "GRANT ALL on MobilePerformance.* to ''@'localhost'"


sudo apt-get -y --no-upgrade install python-setuptools python-all-dev python-django python-memcache python-mysqldb

# nginx config
sudo cat <<EOF > /etc/nginx/sites-available/MobilePerformance
server {
	listen		80;
	server_name .django;
	location /static  {
      alias    /usr/share/uwsgi/MobilePerformance/mobile/static;
    }
	location / {
		uwsgi_pass unix:///run/uwsgi/app/MobilePerformance/socket;
		include uwsgi_params;
	}
}
EOF
sudo ln -sf /etc/nginx/sites-available/MobilePerformance /etc/nginx/sites-enabled/MobilePerformance
	
# uwsgi config
sudo cat <<EOF > /etc/uwsgi/apps-available/MobilePerformance.ini
[uwsgi]
thread=3
master=1
vhost=true
plugin = python
env = DJANGO_SETTINGS_MODULE=performance.settings
module = performance.wsgi
chdir = /usr/share/uwsgi/MobilePerformance
socket = /run/uwsgi/app/MobilePerformance/socket
logto = /var/log/uwsgi/MobilePerformance.log
EOF
sudo ln -sf /etc/uwsgi/apps-available/MobilePerformance.ini /etc/uwsgi/apps-enabled/MobilePerformance.ini

sudo ln -sf /home/stack/MobilePerformance /usr/share/uwsgi/

# create the database and allow it to be writable
cd MobilePerformance
python manage.py migrate

sudo service nginx restart
sudo service uwsgi restart
sudo service mysql restart
sudo service memcached restart

