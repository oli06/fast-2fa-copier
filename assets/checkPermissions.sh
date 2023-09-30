#!/bin/bash

file=$1
# Handle non-absolute paths
if ! [[ "$file" == /* ]] ; then
    path=.
fi
dirname "$file" | tr '/' $'\n' | while read part ; do
    path="$path/$part"
    # Check for execute permissions
    if ! [[ -x "$path" ]] ; then
        echo "blocked"
    fi
done
if ! [[ -r "$file" ]] ; then
    echo "blocked"
fi