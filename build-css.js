const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'input.css');
const outputPath = path.join(__dirname, 'public', 'styles.css');

const input = fs.readFileSync(inputPath, 'utf8');

postcss([tailwindcss('./tailwind.config.js'), autoprefixer])
  .process(input, { from: inputPath, to: outputPath })
  .then((result) => {
    fs.writeFileSync(outputPath, result.css);
    console.log('CSS built successfully!');
  })
  .catch((err) => {
    console.error('Error building CSS:', err);
    process.exit(1);
  });
