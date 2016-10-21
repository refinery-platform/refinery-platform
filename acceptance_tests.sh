#!/usr/bin/env bash

echo 'travis_fold:start:selenium'
# NOTE: Redirect runserver output since it's polluting logs
python manage.py runserver > /dev/null 2>&1 &
pushd ../selenium
# NOTE: Sauce Connect needs SAUCE_USERNAME and SAUCE_ACCESS_KEY
# (https://docs.travis-ci.com/user/sauce-connect/),
# while Pytest looks for SAUCELABS_USERNAME and SAUCELABS_API_KEY
# (http://pytest-selenium.readthedocs.io/en/latest/user_guide.html#sauce-labs).
# This has been recognized as a point of confusion, but there is no plan to change anything.
# https://github.com/pytest-dev/pytest-selenium/issues/53
export SAUCELABS_USERNAME=$SAUCE_USERNAME SAUCELABS_API_KEY=$SAUCE_ACCESS_KEY
printenv | sort | grep SAUCE | perl -pne 's/=(...).+/=$1.../' # Debug helper
export BASE_URL=http://localhost:8000 CREDS_YML=guest_creds.yml UPLOAD=gff3.csv
pytest --driver SauceLabs --capability browserName $BROWSER_NAME --capability version $BROWSER_VERSION --capability platform "$OPERATING_SYSTEM" --capability tunnelIdentifier $TRAVIS_JOB_NUMBER -r fE
popd
echo 'travis_fold:end:selenium'