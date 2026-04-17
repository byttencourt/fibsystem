import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://i.postimg.cc/L6BrHtB9/de7hpuu-0ddf58ce-f5db-4de7-9cb7-a83ff0c4fa48.png';
const dest = path.join(process.cwd(), 'public', 'logo.png');

if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'));
}

https.get(url, (res) => {
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded logo.png');
  });
}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
