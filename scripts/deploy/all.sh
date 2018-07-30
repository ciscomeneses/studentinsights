# Deploy to all sites in parallel
echo "🚢  Fetching from GitHub..."
git fetch origin

# Double quotes since the shell and yarn both are escaping.
echo "🚢  Deploying..."
yarn concurrently \
  --names "demo,somerville,new-bedford" \
  -c "yellow.bold,blue.bold,magenta.bold" \
  "'scripts/deploy/deploy.sh demo'" \
  "'scripts/deploy/deploy.sh somerville'" \
  "'scripts/deploy/deploy.sh new-bedford'"

echo "🚢  Done."