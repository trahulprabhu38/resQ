#!/bin/bash

echo "Testing blood-report API endpoint..."
curl -X GET http://localhost:5001/api/blood-report

echo -e "\n\nDone!" 