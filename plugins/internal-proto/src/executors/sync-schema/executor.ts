import { ExecutorContext, logger } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function runExecutor(
  options: { branch: string },
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const root = context.root;
  const branch = options.branch || 'api-schema';
  const targetLibPath = 'libs/api-schema';

  const syncTargets = ['generated', 'lib', 'mocks'];

  logger.info(`\n🔄 Syncing schema from branch "${branch}" to "${targetLibPath}"...\n`);

  const absoluteTarget = path.join(root, targetLibPath);

  if (!fs.existsSync(absoluteTarget)) {
    fs.mkdirSync(absoluteTarget, { recursive: true });
  }

  try {
    logger.info(`⬇️  Fetching latest changes from origin/${branch}...`);
    execSync(`git fetch origin ${branch}:${branch} -f`, { stdio: 'ignore', cwd: root });
  } catch {
    logger.warn(`⚠️  Failed to fetch latest branch "${branch}" from remote. Using local branch if available.`);
  }

  try {
    execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore', cwd: root });
  } catch {
    logger.error(`❌ Branch "${branch}" does not exist locally and could not be fetched.`);
    return { success: false };
  }

  for (const target of syncTargets) {
    const destPath = path.join(absoluteTarget, target);

    try {
      let lsTreeOutput = '';
      try {
        lsTreeOutput = execSync(`git ls-tree ${branch} ${target}`, { cwd: root }).toString().trim();
      } catch {
        // target not found
      }

      if (!lsTreeOutput) {
        logger.warn(`⚠️  Target "${target}" not found in branch "${branch}". Skipping.`);
        continue;
      }

      const isDirectory = lsTreeOutput.includes('tree');
      const isFile = lsTreeOutput.includes('blob');

      if (isDirectory) {
        logger.info(`📦 Extracting directory "${target}"...`);
        if (fs.existsSync(destPath)) fs.rmSync(destPath, { recursive: true, force: true });

        const cmd = `git archive --format=tar --remote=. ${branch} ${target} | tar -xf - -C ${absoluteTarget}`;
        execSync(cmd, { cwd: root });

      } else if (isFile) {
        logger.info(`📄 Extracting file "${target}"...`);
        if (fs.existsSync(destPath)) fs.rmSync(destPath, { recursive: true, force: true });

        const content = execSync(`git show ${branch}:${target}`, { cwd: root });
        fs.writeFileSync(destPath, content);
      }

    } catch (e) {
      logger.error(`❌ Failed to sync "${target}": ${e.message}`);
    }
  }

  logger.info('\n✅ Schema sync completed successfully.');
  return { success: true };
}
