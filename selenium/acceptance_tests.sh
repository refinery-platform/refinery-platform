#!/usr/bin/env bash

# Fail script if error occurs at any step
set -e

echo "Setting up env vars..."
export PYTHONPATH=$PYTHONPATH:../refinery:../refinery/config
export BASE_URL=http://localhost:8000 CREDS_YML=guest_creds.yml UPLOAD=gff3.csv

echo "Installing Geckodriver..."
TAR=geckodriver-v0.11.1-linux64.tar
wget https://github.com/mozilla/geckodriver/releases/download/v0.11.1/$TAR.gz > acceptance_tests.log 2>&1
gunzip $TAR.gz
tar -xvf $TAR
rm $TAR # Tar file hides binary on Travis: https://github.com/SeleniumHQ/selenium/issues/2966
chmod a+x geckodriver
export PATH=$PATH:`pwd`

echo "Installing Firefox and Xvfb..."
sudo apt-get install firefox xvfb -y  > acceptance_tests.log 2>&1

echo "Starting Xvfb..."
sudo Xvfb :10 -ac &
export DISPLAY=:10

echo "Running tests..."
pytest --driver Firefox

sudo killall Xvfb
sudo rm -rf /tmp/.X10-lock