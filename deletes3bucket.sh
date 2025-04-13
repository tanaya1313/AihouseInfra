#!/bin/bash

# Pattern to match in bucket names
PATTERN="test"

# Get all buckets that match the pattern
buckets=$(aws s3api list-buckets --query "Buckets[].Name" --output text | tr '\t' '\n' | grep -- "$PATTERN")

if [ -z "$buckets" ]; then
  echo "No buckets found matching pattern: $PATTERN"
  exit 0
fi

# Loop through each bucket and delete it
for bucket in $buckets; do
  echo "🗑️ Deleting bucket: $bucket"

  # Empty the bucket
  if aws s3 rm "s3://$bucket" --recursive; then
    echo "✅ Emptied bucket: $bucket"
  else
    echo "⚠️ Failed to empty bucket: $bucket"
    continue
  fi

  # Delete the bucket
  if aws s3api delete-bucket --bucket "$bucket"; then
    echo "✅ Deleted bucket: $bucket"
  else
    echo "❌ Failed to delete bucket: $bucket"
  fi

  echo "-------------------------"
done

echo "✅ All matching buckets processed."
