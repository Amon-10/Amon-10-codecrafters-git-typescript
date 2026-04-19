import * as fs from "fs";
import * as zlib from "zlib";
import {createHash} from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    // You can use print statements as follows for debugging, they'll be visible when running tests.
    console.error("Logs from your program will appear here!");

    // TODO: Uncomment the code below to pass the first stage
    fs.mkdirSync(".git", { recursive: true });
    fs.mkdirSync(".git/objects", { recursive: true });
    fs.mkdirSync(".git/refs", { recursive: true });
    fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
    break;
  
  case "cat-file":
    const directory = args[2].slice(0,2);
    const fileName =  args[2].slice(2);
    
    try {
      // Read blob 
      const content = fs.readFileSync(`.git/objects/${directory}/${fileName}`);

      // Decompress
      // Use .unzipSync when unsure whether header is zlib(buffer) or gzlib(.gz)
      const decompressContent = zlib.unzipSync(content); // we could've used .inflateSync since we are dealing with zlib(buffer)

      // Extract content
      // ignore header(blob <size>\0)
      const realContent = decompressContent.toString().split("\0")[1];
      process.stdout.write(realContent);
      // test log
      //process.stdout.write(content) // according to git
      // console.log(decompressContent);
    } catch (err) {
      console.error("Error reading and decompressing blob");
    }

    break;
  
  case "hash-object":
    // 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
    // Read file content
    const fileContent = fs.readFileSync(args[2]); // buffer
    // convert buffer to bytes/ array buffer
    const buf = Buffer.from(fileContent);
    const fileContentBuffer = [...buf];
    
    const contentSize = Buffer.byteLength(fileContent); // get length of file content
    
    const header = `blob ${contentSize}\0`; // create header, prepend \0
    const headerBuffer = Array.from(header, char => char.charCodeAt(0)); // Convert header into bytes
    
    const gitObjectDataBuffer = [...headerBuffer, ...fileContentBuffer]; //join header and fileContent
    const compressedContent = zlib.deflateSync(Buffer.from(gitObjectDataBuffer));
    const decompressedContent = zlib.inflateSync(compressedContent);

    // create hash
    const hash = createHash('sha1')
      .update(decompressedContent) // input data to be hashed
      .digest('hex'); // calculates digest and outs in 'hex' format
    
    // Write hashed content to .git/objects
    const hashedDirectoryName = hash.slice(0,2);
    const hashedFileName = hash.slice(2);
    const dirPath = `.git/objects/${hashedDirectoryName}`;
    const filePath = `${dirPath}/${hashedFileName}`;
    
    fs.mkdirSync(`${dirPath}`, { recursive: true });
    fs.writeFileSync(filePath, compressedContent);
  
    // process.stdout.write(fileContent);
    // process.stdout.write(typeof(stringFileContent));
    //process.stdout.write(fileContent);
    // process.stdout.write(compressedContent);
    console.log(hash);

    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
