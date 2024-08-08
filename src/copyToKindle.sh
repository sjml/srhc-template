#!/usr/bin/env bash

cd "$(dirname "$0")"
cd ..

KINDLE=/Volumes/Kindle
BOOK=static/downloads/NullaLaborumExercitationNostrud.azw3

if [[ ! -d $KINDLE ]]; then
  echo "${KINDLE} is not connected!"
  exit 1
fi

if [[ ! -f $BOOK ]]; then
  echo "No built version of ${BOOK}!"
  exit 1
fi

cp $BOOK $KINDLE/documents

osascript 2>/dev/null <<EOD
  set diskName to "Kindle"
  tell application "Finder"
    if disk diskName exists then
      eject disk diskName
    end if
  end tell
EOD
