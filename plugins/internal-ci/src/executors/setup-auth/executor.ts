import { ExecutorContext, logger } from '@nx/devkit';
import { execSync } from 'child_process';

export default async function runExecutor(
  options: { domain?: string; project?: string; region?: string; repo?: string },
  context: ExecutorContext
): Promise<{ success: boolean }> {
  // /des で生成時にプロジェクト固有値を設定する
  const REQUIRED_DOMAIN = options.domain || '{{GCLOUD_DOMAIN}}';
  const REQUIRED_PROJECT = options.project || '{{GCP_PROJECT_ID}}';
  const AR_REGION = options.region || '{{AR_REGION}}';
  const AR_REPO = options.repo || '{{AR_REPO}}';

  logger.info('\n👮 Verifying Google Cloud Authentication & Permissions...\n');

  try {
    try {
      execSync('gcloud --version', { stdio: 'ignore' });
    } catch {
      logger.error('❌ "gcloud" CLI is not installed or not in PATH.');
      return { success: false };
    }

    const account = execSync('gcloud config get-value account', { encoding: 'utf-8' }).trim();
    logger.info(`👤 Active Account: ${account}`);

    if (!account.endsWith(REQUIRED_DOMAIN)) {
      logger.error(`❌ Invalid account domain.`);
      logger.error(`   Expected: *${REQUIRED_DOMAIN}`);
      logger.error(`   Current : ${account}`);
      logger.error(`\n   Please run: gcloud auth login`);
      return { success: false };
    }

    const currentProject = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();

    if (currentProject !== REQUIRED_PROJECT) {
      logger.warn(`⚠️  Current project is "${currentProject}" (Expected: "${REQUIRED_PROJECT}")`);
      logger.info(`   👉 Switching project to "${REQUIRED_PROJECT}"...`);
      try {
        execSync(`gcloud config set project ${REQUIRED_PROJECT}`, { stdio: 'ignore' });
        logger.info(`   ✅ Project set to ${REQUIRED_PROJECT}`);
      } catch {
        logger.error(`❌ Failed to switch project. You may not have access to ${REQUIRED_PROJECT}.`);
        return { success: false };
      }
    } else {
      logger.info(`✅ Active Project: ${currentProject}`);
    }

    logger.info(`🔍 Verifying access to Artifact Registry (${AR_REPO})...`);

    try {
      execSync(
        `gcloud artifacts repositories describe ${AR_REPO} --location=${AR_REGION} --project=${REQUIRED_PROJECT}`,
        { stdio: 'ignore' }
      );
      logger.info('✅ Artifact Registry access granted (Repository found).');
    } catch (e) {
      logger.error(`❌ Cannot access Artifact Registry repository "${AR_REPO}".`);
      logger.error(`   Possible causes:`);
      logger.error(`   - Missing IAM role "Artifact Registry Reader"`);
      logger.error(`   - Repository does not exist`);
      logger.error(`   - Docker auth not configured (run: gcloud auth configure-docker ${AR_REGION}-docker.pkg.dev)`);
      return { success: false };
    }

    logger.info('\n🎉 Auth check passed! You are ready to build & pull images.');
    return { success: true };

  } catch (err) {
    logger.error(`❌ Unexpected error during auth check: ${err.message}`);
    return { success: false };
  }
}
