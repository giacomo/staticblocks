import chalk from 'chalk';
import chokidar from 'chokidar';
import path from 'path';
import http from 'http';
import fs from 'fs-extra';
import { WebSocketServer, WebSocket } from 'ws';
import { Builder } from '../core/builder';
import { DevOptions } from '../types';

export async function devCommand(options: DevOptions = {}): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 StaticBlocks - Dev Server\n'));

  const port = options.port || 3000;
  const wsPort = port + 1; // WebSocket on next port
  const srcPath = path.join(process.cwd(), 'src');
  const distPath = path.join(process.cwd(), 'dist');

  // WebSocket server for live reload
  const wss = new WebSocketServer({ port: wsPort });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function notifyClients() {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('reload');
      }
    });
  }

  // Initial build
  console.log(chalk.yellow('Running initial build...'));
  const builder = new Builder();
  await builder.build({ verbose: false, dev: true });
  console.log(chalk.green('Initial build complete\n'));

  // Start file watcher
  const watcher = chokidar.watch(srcPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on('change', async (changedPath) => {
      console.log(chalk.cyan(`\n📝 File changed: ${path.relative(process.cwd(), changedPath)}`));
      console.log(chalk.yellow('Rebuilding...'));

      try {
        await builder.build({ verbose: false, dev: true });
        console.log(chalk.green('✓ Rebuild complete'));
        notifyClients();
      } catch (error) {
        console.error(chalk.red('✗ Rebuild failed:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
    .on('add', async (addedPath) => {
      console.log(chalk.cyan(`\n➕ File added: ${path.relative(process.cwd(), addedPath)}`));
      console.log(chalk.yellow('Rebuilding...'));

      try {
        await builder.build({ verbose: false, dev: true });
        console.log(chalk.green('✓ Rebuild complete'));
        notifyClients();
      } catch (error) {
        console.error(chalk.red('✗ Rebuild failed:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    })
    .on('unlink', async (removedPath) => {
      console.log(chalk.cyan(`\n➖ File removed: ${path.relative(process.cwd(), removedPath)}`));
      console.log(chalk.yellow('Rebuilding...'));

      try {
        await builder.build({ verbose: false, dev: true });
        console.log(chalk.green('✓ Rebuild complete'));
        notifyClients();
      } catch (error) {
        console.error(chalk.red('✗ Rebuild failed:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    });

  // Create simple HTTP server
  const server = http.createServer(async (req, res) => {
    try {
      let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';

      // Remove query string
      filePath = filePath.split('?')[0];

      // Serve directory index as index.html
      if (!path.extname(filePath)) {
        filePath = path.join(filePath, 'index.html');
      }

      const fullPath = path.join(distPath, filePath);

      // Security check - ensure path is within dist directory
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(distPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Check if file exists
      if (!await fs.pathExists(fullPath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Read and serve file
      const content = await fs.readFile(fullPath);
      const ext = path.extname(filePath);

      // Set content type
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);

      // Log request in gray
      console.log(chalk.gray(`${req.method} ${req.url}`));
    } catch (error) {
      console.error(chalk.red('Server error:'), error);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    console.log(chalk.green.bold(`\n✓ Dev server running at http://localhost:${port}\n`));
    console.log(chalk.cyan('Watching for changes...\n'));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nShutting down dev server...'));
    watcher.close();
    server.close();
    wss.close();
    process.exit(0);
  });
}
