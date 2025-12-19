import chalk from 'chalk';
import { Builder } from '../core/builder';
import { BuildOptions } from '../types';

export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  console.log(chalk.blue.bold('\n🔨 StaticBlocks - Build\n'));

  const startTime = Date.now();

  try {
    const builder = new Builder();
    await builder.build(options);

    const duration = Date.now() - startTime;
    console.log(chalk.green.bold(`\n✅ Build completed in ${duration}ms\n`));
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Build failed:\n'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));

    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}
