#!/bin/bash -ex

echo "changing directory to user..."
cd ~
echo "running apt-get update..."
sudo apt-get update
echo "installing git, node.js, npm, pigpio..."
sudo apt-get install -y git, node.js npm pigpio
echo "entering ZeroTank dir..."
cd ~/ZeroTank
echo "installing express, socket.io, pi-gpio, pigpio through npm"
sudo npm install express
sudo npm install socket.io
sudo npm install pi-gpio
sudo npm install pigpio
echo "changing directory to user..."
cd ~
echo "installing libjpeg62-turbo-dev, cmake..."
sudo apt-get install -y libjpeg62-turbo-dev cmake
echo "creating symlinks for depricated path /opt/vc/..."
sudo mkdir -p /opt/vc/
sudo ln -s /usr/include /opt/vc/include
sudo ln -s /lib/arm-linux-gnueabihf /usr/lib/ /opt/vc/lib
echo "fetching mjpg-streamer..."
git clone https://github.com/jacksonliam/mjpg-streamer.git mjpg-streamer
echo "entering mjpg-streamer install dir..."
cd mjpg-streamer/mjpg-streamer-experimental
echo "make clean..."
make clean all
echo "make /opt/mjpg-streamer dir..."
sudo mkdir /opt/mjpg-streamer
echo "move mjpg-streamer files to /opt/mjpg-streamer dir..."
sudo mv * /opt/mjpg-streamer
echo "creating systemd service..."
sudo cat <<EOF > /etc/systemd/system/ZeroTank.service
[Unit]
Description=Node.js script for controlling WiFi RC unit
After=network.target

[Service]
Environment=NODE_PORT=80
Type=simple
ExecStart=/usr/bin/node /home/pi/ZeroTank/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
echo "updating systemd daemon..."
sudo systemctl daemon-reload
echo "enabling systemd service to auto-start..."
sudo systemctl enable ZeroTank.service
echo "starting systemd service..."
sudo systemctl start ZeroTank.service
echo "is service running?"
sudo systemctl status ZeroTank.service
echo "DONE."

