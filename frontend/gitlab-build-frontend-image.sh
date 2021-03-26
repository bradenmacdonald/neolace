apk add --no-cache rsync
cd frontend
mkdir -p .build-temp
# Copy the neolace-api folder into the build context:
rsync -avr --exclude='node_modules' ../neolace-api .build-temp/

if [ "$CI_COMMIT_REF_NAME" == "main" ]; then
    # On main, we tag with a release name like "build14-abcd678"
    FRONTEND_IMAGE_TAG="build${CI_PIPELINE_IID}-${CI_COMMIT_SHORT_SHA}"
else
    # For merge requests, just use the branch name as the image tag; we don't want to pollute the container registry
    # with too many random branch builds.
    # In this case, new builds will overwrite previous ones, using the same tag.
    FRONTEND_IMAGE_TAG=$CI_COMMIT_REF_SLUG
fi
# And share this variable with future pipeline stages:
echo FRONTEND_IMAGE_TAG="$FRONTEND_IMAGE_TAG" >> $CI_PROJECT_DIR/variables.env

docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
docker build --pull -t $CI_REGISTRY/technotes.org/technotes-app/frontend:$FRONTEND_IMAGE_TAG .
docker push $CI_REGISTRY/technotes.org/technotes-app/frontend:$FRONTEND_IMAGE_TAG
