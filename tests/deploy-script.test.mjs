import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScript = await readFile(
  new URL("../deploy.sh", import.meta.url),
  "utf8",
);

test("reports an in-progress deployment before fetching source", () => {
  const createDeployment = deployScript.indexOf(
    'if deployment_id="$($DEPLOYMENT_REPORTER create',
  );
  const reportInProgress = deployScript.indexOf(
    "report_deployment_status in_progress",
  );
  const fetchSource = deployScript.indexOf("mesh-proxy exec git fetch");

  assert.notEqual(createDeployment, -1);
  assert.notEqual(reportInProgress, -1);
  assert.notEqual(fetchSource, -1);
  assert.ok(createDeployment < fetchSource);
  assert.ok(reportInProgress < fetchSource);
});

test("fetches over HTTPS so mesh-proxy can proxy GitHub traffic", () => {
  assert.match(
    deployScript,
    /FETCH_URL=.*https:\/\/github\.com\/.*\.git/,
  );
  assert.match(
    deployScript,
    /mesh-proxy exec git fetch --prune "\$FETCH_URL"/,
  );
});
