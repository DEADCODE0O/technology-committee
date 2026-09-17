const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createZip(outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Zip created: ${outPath} (${(archive.pointer() / (1024 * 1024)).toFixed(2)} MB)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    archive.glob('**/*', {
      cwd: path.resolve(__dirname, '..'),
      ignore: [
        'node_modules/**',
        '.next/**',
        '.git/**',
        '*.zip',
        '.system_generated/**',
        'scripts/*.log',
        'scripts/*pid.txt',
      ],
      dot: true,
    });

    archive.finalize();
  });
}

async function main() {
  const out1 = path.resolve(__dirname, '..', '..', 'tech-committee-platform-UPDATED.zip');
  const out2 = path.resolve(__dirname, '..', '..', 'tech-committee-project-latest.zip');
  
  if (fs.existsSync(out1)) fs.unlinkSync(out1);
  if (fs.existsSync(out2)) fs.unlinkSync(out2);

  await createZip(out1);
  fs.copyFileSync(out1, out2);
  console.log(`Copied to: ${out2}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
