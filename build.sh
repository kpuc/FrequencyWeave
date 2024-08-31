#!/bin/bash

web-ext lint --source-dir=./src/
# add signing too
web-ext build --source-dir=./src/ --artifacts-dir=./build/ --overwrite-dest

# helper script to sychronize the build from the developers build box to the developers test box
# this is *not* required to build
if [ -f syncBuild.sh ]; then
        bash syncBuild.sh
fi

