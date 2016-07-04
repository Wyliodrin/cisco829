#!/bin/sh

rm -rf nodes/*
cp -r ../volumes/wyliodrin/nodes/* nodes/
git add .
git commit -am "$1"
git push

