import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DefaultArtifactClient } from '@actions/artifact';

const ARTIFACT_DIR_NAME = 'sha1-hulud-artifacts';
const ARTIFACT_FILE_NAME = 'suspicious-activity.csv';
const ARTIFACT_NAME = 'sha1-hulud-suspicious-activity';

export async function uploadCsvArtifact(csvContent: string): Promise<void> {
  const artifactDir = path.join(process.env.RUNNER_TEMP || os.tmpdir(), ARTIFACT_DIR_NAME);
  fs.mkdirSync(artifactDir, { recursive: true });

  const csvPath = path.join(artifactDir, ARTIFACT_FILE_NAME);
  fs.writeFileSync(csvPath, csvContent);

  const artifact = new DefaultArtifactClient();
  await artifact.uploadArtifact(ARTIFACT_NAME, [csvPath], artifactDir);
}
