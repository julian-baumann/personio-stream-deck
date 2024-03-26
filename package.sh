#!/bin/sh

rm -rf ./bin
mkdir ./bin
DistributionTool -b -i src/com.julian-baumann.personio-deck.sdPlugin -o ./bin
