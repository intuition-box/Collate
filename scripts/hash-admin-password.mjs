import { randomBytes, scryptSync } from 'node:crypto';

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal.');
  }

  process.stdout.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';

    function cleanup() {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Password hashing cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          process.stdout.write('*');
        }
      }
    }

    process.stdin.on('data', onData);
  });
}

async function main() {
  const password = await readHidden('Admin password: ');
  if (password.length < 12) {
    throw new Error('Use an admin password with at least 12 characters.');
  }

  const confirmation = await readHidden('Confirm password: ');
  if (password !== confirmation) {
    throw new Error('The passwords did not match.');
  }

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  process.stdout.write(`\nADMIN_PASSWORD_HASH=scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to hash the password.');
  process.exitCode = 1;
});
