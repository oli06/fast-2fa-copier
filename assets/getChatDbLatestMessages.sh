#!/bin/bash

db=$1
limit=$2

if [[ -n "$db"  ]]; then
    sqlite3 $db "SELECT ROWID, text, HEX(attributedBody), datetime((date / 1000000000) + 978307200, 'unixepoch', 'localtime') as timestamp FROM message WHERE is_sent=0 ORDER BY ROWID DESC LIMIT $limit" | while read row; do
        echo "${row}"
    done
else
    echo "db name required - error"
fi

